import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODEL_REPO = "Xenova/whisper-tiny.en";
const MODEL_FILES = [
    "config.json",
    "preprocessor_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "generation_config.json",
    "vocab.json",
    "merges.txt",
    "normalizer.json",
    "special_tokens_map.json",
    "added_tokens.json",
    "onnx/encoder_model.onnx",
    "onnx/decoder_model_merged.onnx",
];

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(scriptDirectory, "../public/models/whisper-tiny.en");

const fileExists = async (filePath) => access(filePath).then(() => true).catch(() => false);

const downloadFile = async (relativePath) => {
    const destination = path.join(outputDirectory, relativePath);

    if (await fileExists(destination)) {
        console.log(`Skipped ${relativePath}`);
        return;
    }

    const url = `https://huggingface.co/${MODEL_REPO}/resolve/main/${relativePath}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to download ${relativePath}: ${response.status} ${response.statusText}`);
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.from(await response.arrayBuffer()));
    console.log(`Downloaded ${relativePath}`);
};

await mkdir(outputDirectory, { recursive: true });

for (const file of MODEL_FILES) {
    await downloadFile(file);
}

console.log(`Speech model saved to ${outputDirectory}`);
