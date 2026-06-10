import {
    env,
    pipeline,
    type ProgressInfo,
    type Text2TextGenerationOutput,
    type Text2TextGenerationPipeline,
} from "@huggingface/transformers";

export interface InferenceProgress {
    status: ProgressInfo["status"] | "loading";
    file?: string;
    progress?: number;
}

export type InferenceProgressCallback = (progress: InferenceProgress) => void;

const MODEL_PATH = "/models/geometric";

let generatorPromise: Promise<Text2TextGenerationPipeline> | null = null;

type GenerationUpdatePayload = {
    generated_input_ids: bigint[][];
    outputs: Record<string, unknown>;
    model_inputs: Record<string, unknown>;
    is_encoder_decoder: boolean;
};

type CachePatchableModel = {
    _update_model_kwargs_for_generation?: (payload: GenerationUpdatePayload) => Record<string, unknown>;
    sessions?: Record<string, OnnxSession>;
    __geometricSplitDecoderPatch?: boolean;
};

type PipelineWithModel = Text2TextGenerationPipeline & {
    model?: CachePatchableModel;
};

type TensorLike = {
    dims?: number[];
};

type OnnxSession = {
    inputNames: string[];
    inputMetadata: Array<{ name: string; shape: ReadonlyArray<number | string>; type: string }>;
    outputNames: string[];
    run: (feeds: Record<string, unknown>) => Promise<Record<string, unknown>>;
    release?: () => Promise<void>;
};

type OnnxSessionConstructor = {
    create: (path: string) => Promise<OnnxSession>;
};

const normalizeProgress = (progressInfo: ProgressInfo): InferenceProgress => {
    if ("progress" in progressInfo) {
        return {
            status: progressInfo.status,
            file: "file" in progressInfo ? progressInfo.file : undefined,
            progress: Math.round(progressInfo.progress),
        };
    }

    return {
        status: progressInfo.status,
        file: "file" in progressInfo ? progressInfo.file : undefined,
    };
};

const pickFeeds = (feeds: Record<string, unknown>, inputNames: string[]) => {
    return inputNames.reduce<Record<string, unknown>>((selectedFeeds, inputName) => {
        if (inputName in feeds) {
            selectedFeeds[inputName] = feeds[inputName];
        }

        return selectedFeeds;
    }, {});
};

const hasDecoderCache = (feeds: Record<string, unknown>) => {
    return Object.entries(feeds).some(([name, value]) => {
        if (!name.startsWith("past_key_values")) {
            return false;
        }

        const dims = (value as TensorLike).dims;
        return Array.isArray(dims) && dims.every((dimension) => dimension > 0);
    });
};

const createSplitDecoderSession = async (noCacheSession: OnnxSession) => {
    const sessionConstructor = noCacheSession.constructor as unknown as OnnxSessionConstructor;
    const withPastSession = await sessionConstructor.create(
        `${MODEL_PATH}/onnx/decoder_with_past_model_quantized.onnx`
    );
    const inputNames = Array.from(
        new Set([...noCacheSession.inputNames, ...withPastSession.inputNames])
    );

    return {
        inputNames,
        inputMetadata: withPastSession.inputMetadata,
        outputNames: Array.from(new Set([...noCacheSession.outputNames, ...withPastSession.outputNames])),
        run: (feeds: Record<string, unknown>) => {
            const targetSession = hasDecoderCache(feeds) ? withPastSession : noCacheSession;
            return targetSession.run(pickFeeds(feeds, targetSession.inputNames));
        },
        release: async () => {
            await Promise.all([noCacheSession.release?.(), withPastSession.release?.()]);
        },
    };
};

const installSplitDecoderAdapter = async (generator: Text2TextGenerationPipeline) => {
    const model = (generator as PipelineWithModel).model;
    const noCacheSession = model?.sessions?.decoder_model_merged;
    if (!model?.sessions || !noCacheSession || model.__geometricSplitDecoderPatch) {
        return;
    }

    model.sessions.decoder_model_merged = await createSplitDecoderSession(noCacheSession);
    model.__geometricSplitDecoderPatch = true;
};

const getGenerator = (onProgress?: InferenceProgressCallback) => {
    if (!generatorPromise) {
        env.allowLocalModels = true;
        env.allowRemoteModels = false;
        env.localModelPath = "/models/";
        env.useBrowserCache = false;

        onProgress?.({ status: "loading" });
        generatorPromise = pipeline("text2text-generation", MODEL_PATH, {
            progress_callback: (progressInfo) => {
                onProgress?.(normalizeProgress(progressInfo));
            },
        }).then(async (generator) => {
            await installSplitDecoderAdapter(generator);
            return generator;
        });
    }

    return generatorPromise;
};

const getGeneratedText = (output: Text2TextGenerationOutput) => {
    return output[0]?.generated_text?.trim() ?? "";
};

export const runInference = async (
    prompt: string,
    onProgress?: InferenceProgressCallback
) => {
    const generator = await getGenerator(onProgress);
    const output = await generator(prompt, {
        max_new_tokens: 160,
    });

    return getGeneratedText(output);
};
