import {
    env,
    pipeline,
    type AutomaticSpeechRecognitionOutput,
    type ProgressInfo,
} from "@huggingface/transformers";

const SPEECH_MODEL_PATH = "whisper-tiny.en";

export interface SpeechRecognitionProgress {
    status: "loading" | "ready" | "transcribing";
    file?: string;
    progress?: number;
}

export type SpeechRecognitionProgressCallback = (progress: SpeechRecognitionProgress) => void;

let transcriberPromise: ReturnType<typeof loadTranscriber> | null = null;
let loadedTranscriber: Awaited<ReturnType<typeof loadTranscriber>> | null = null;
let pendingProgressCallbacks: SpeechRecognitionProgressCallback[] = [];

const configureSpeechEnvironment = () => {
    env.allowLocalModels = true;
    env.allowRemoteModels = true;
    env.localModelPath = "/models/";
    env.useBrowserCache = true;
};

const normalizeProgress = (progressInfo: ProgressInfo): SpeechRecognitionProgress => {
    if ("progress" in progressInfo) {
        return {
            status: "loading",
            file: "file" in progressInfo ? progressInfo.file : undefined,
            progress: Math.round(progressInfo.progress),
        };
    }

    if (progressInfo.status === "ready") {
        return { status: "ready" };
    }

    return {
        status: "loading",
        file: "file" in progressInfo ? progressInfo.file : undefined,
    };
};

const notifyProgress = (progress: SpeechRecognitionProgress) => {
    pendingProgressCallbacks.forEach((callback) => callback(progress));
};

const extractTranscript = (result: AutomaticSpeechRecognitionOutput | AutomaticSpeechRecognitionOutput[]) => {
    const outputs = Array.isArray(result) ? result : [result];
    const text = outputs
        .map((entry) => entry?.text?.trim() ?? "")
        .filter(Boolean)
        .join(" ")
        .trim();

    if (text) {
        return text;
    }

    const chunkText = outputs
        .flatMap((entry) => entry?.chunks ?? [])
        .map((chunk) => chunk.text?.trim() ?? "")
        .filter(Boolean)
        .join(" ")
        .trim();

    return chunkText;
};

const loadTranscriber = () => {
    configureSpeechEnvironment();
    notifyProgress({ status: "loading" });

    return pipeline("automatic-speech-recognition", SPEECH_MODEL_PATH, {
        dtype: "fp32",
        progress_callback: (progressInfo) => {
            notifyProgress(normalizeProgress(progressInfo));
        },
    }).then((transcriber) => {
        loadedTranscriber = transcriber;
        notifyProgress({ status: "ready" });
        pendingProgressCallbacks = [];
        return transcriber;
    });
};

const getTranscriber = async (onProgress?: SpeechRecognitionProgressCallback) => {
    if (onProgress) {
        pendingProgressCallbacks.push(onProgress);
    }

    if (!transcriberPromise) {
        transcriberPromise = loadTranscriber().catch((error) => {
            transcriberPromise = null;
            loadedTranscriber = null;
            pendingProgressCallbacks = [];
            throw error;
        });
    }

    return transcriberPromise;
};

export const isSpeechModelLoaded = () => loadedTranscriber !== null;

export const isSpeechModelLoadPending = () => transcriberPromise !== null && loadedTranscriber === null;

export const resetSpeechModel = () => {
    transcriberPromise = null;
    loadedTranscriber = null;
    pendingProgressCallbacks = [];
};

export const preloadSpeechModel = (onProgress?: SpeechRecognitionProgressCallback) =>
    getTranscriber(onProgress);

export const getSpeechTranscriptionErrorMessage = (error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);

    if (/Missing required scale|TransposeDQWeightsForMatMulNBits|Can't create a session/i.test(detail)) {
        return "Offline speech model weights are incompatible. Run npm run download:speech-model and reload.";
    }
    if (/local model.*not found|could not locate file|404|Unexpected token|<!DOCTYPE/i.test(detail)) {
        return "Offline speech model files are missing. Run npm run download:speech-model and reload.";
    }
    if (detail.includes("allowRemoteModels=false")) {
        return "Offline speech model could not download. Reload and try again.";
    }
    if (/network|fetch|failed to fetch/i.test(detail)) {
        return "Offline speech model download failed. Check your connection and try again.";
    }
    if (/AudioContext|microphone|getUserMedia/i.test(detail)) {
        return "Microphone capture failed. Check browser permissions and try again.";
    }

    return "Could not transcribe speech. Tap the mic to try again.";
};

export const transcribeAudioSamples = async (
    samples: Float32Array,
    onProgress?: SpeechRecognitionProgressCallback
) => {
    if (!samples.length) {
        return "";
    }

    configureSpeechEnvironment();
    const transcriber = await getTranscriber(onProgress);
    onProgress?.({ status: "transcribing" });

    const result = await transcriber(samples);

    return extractTranscript(result);
};
