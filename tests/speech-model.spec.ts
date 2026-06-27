import { chromium, expect, test } from "@playwright/test";
import { gotoFreshApp } from "./helpers/storage";

const SPEECH_MODEL_ASSETS = [
    "/models/whisper-tiny.en/config.json",
    "/models/whisper-tiny.en/tokenizer.json",
    "/models/whisper-tiny.en/vocab.json",
    "/models/whisper-tiny.en/merges.txt",
    "/models/whisper-tiny.en/special_tokens_map.json",
    "/models/whisper-tiny.en/added_tokens.json",
    "/models/whisper-tiny.en/onnx/encoder_model.onnx",
    "/models/whisper-tiny.en/onnx/decoder_model_merged.onnx",
];

test.describe("offline speech model", () => {
    test("loads local assets and transcribes from ChatPanel mic flow", async () => {
        test.setTimeout(180_000);

        const consoleMessages: string[] = [];
        const pageErrors: string[] = [];

        const browser = await chromium.launch({
            args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
        });
        const context = await browser.newContext({
            baseURL: "http://127.0.0.1:41873",
            permissions: ["microphone"],
        });
        const page = await context.newPage();

        page.on("console", (message) => {
            consoleMessages.push(`[${message.type()}] ${message.text()}`);
        });
        page.on("pageerror", (error) => {
            pageErrors.push(error.message);
        });

        await gotoFreshApp(page);

        const modelAssetChecks = await page.evaluate(async (assets) => {
            const results = await Promise.all(
                assets.map(async (assetPath) => {
                    const response = await fetch(assetPath);
                    return {
                        assetPath,
                        ok: response.ok,
                        status: response.status,
                        contentType: response.headers.get("content-type") ?? "",
                    };
                })
            );

            return results;
        }, SPEECH_MODEL_ASSETS);

        const invalidAssets = modelAssetChecks.filter(
            (entry) => !entry.ok || entry.contentType.includes("text/html")
        );
        expect(
            invalidAssets,
            `Missing or invalid speech model assets: ${JSON.stringify(invalidAssets, null, 2)}`
        ).toEqual([]);

        const directTranscription = await page.evaluate(async () => {
            const { transcribeAudioSamples } = await import(
                "/v3/src/Services/SpeechRecognition/localSpeech.ts"
            );
            const samples = new Float32Array(16000);
            for (let index = 0; index < samples.length; index += 1) {
                samples[index] = Math.sin((index / 16000) * Math.PI * 4) * 0.2;
            }

            try {
                await transcribeAudioSamples(samples);
                return { error: null };
            } catch (error) {
                return {
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        expect(
            directTranscription.error,
            `Direct transcription failed: ${directTranscription.error ?? "unknown"}`
        ).toBeNull();

        await page.getByTestId("assistant-launcher").click();
        await expect(page.getByTestId("assistant-panel")).toBeVisible();

        await page.getByRole("button", { name: "Start voice input" }).click();
        await expect(page.getByRole("button", { name: "Stop listening" })).toBeVisible();

        await page.waitForTimeout(2500);
        await page.getByRole("button", { name: "Stop listening" }).click();

        await expect
            .poll(
                async () =>
                    page.locator(".chat-message.assistant.voice-error, .chat-message.user").count(),
                { timeout: 120_000 }
            )
            .toBeGreaterThan(0);

        await expect(page.locator(".chat-message.assistant.voice-error")).toHaveCount(0);
        await expect(page.locator(".chat-message.user").last()).toBeVisible();

        if (pageErrors.length) {
            throw new Error(`Page errors during mic flow:\n${pageErrors.join("\n")}`);
        }

        const relevantConsoleErrors = consoleMessages.filter((line) => line.startsWith("[error]"));
        expect(relevantConsoleErrors).toEqual([]);

        await browser.close();
    });
});
