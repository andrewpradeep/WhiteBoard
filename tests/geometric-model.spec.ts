import { expect, test } from "./fixtures/app.fixture";

const isModelOrRuntimeAsset = (url: string) => {
    return (
        url.includes("/models/") ||
        url.includes("/geometric/") ||
        url.includes("/onnx/") ||
        url.endsWith(".onnx") ||
        url.includes("ort-wasm") ||
        url.includes("onnxruntime")
    );
};

test.describe("@slow geometric model", () => {
    test("@slow loads model assets and generates shapes", async ({ page, whiteboard, assistant }) => {
        test.setTimeout(120_000);

        const modelRequests: string[] = [];
        const htmlFallbackResponses: string[] = [];

        page.on("request", (request) => {
            const url = request.url();
            if (isModelOrRuntimeAsset(url)) {
                modelRequests.push(`${request.method()} ${url}`);
            }
        });

        page.on("response", (response) => {
            const url = response.url();
            if (isModelOrRuntimeAsset(url)) {
                const contentType = response.headers()["content-type"] ?? "";
                if (contentType.includes("text/html")) {
                    htmlFallbackResponses.push(`${response.status()} ${contentType} ${url}`);
                }
            }
        });

        await whiteboard.drawRectangleAt(240, 180);
        await assistant.open();
        await assistant.send("add a circle to the right of the rectangle");

        await assistant.expectModelConsent();
        await assistant.confirmModelDownload();
        await assistant.expectLoadingOverlay();

        await expect
            .poll(() => modelRequests.length, {
                message: "Expected local model or ONNX runtime asset requests.",
                timeout: 45_000,
            })
            .toBeGreaterThan(0);

        await expect(page.locator(".chat-message.assistant.pending")).toHaveCount(0, {
            timeout: 90_000,
        });

        expect(htmlFallbackResponses).toEqual([]);
        await expect(page.getByText(/I could not run inference/i)).toHaveCount(0);
        await expect(page.getByText(/Added .* generated shape/i)).toBeVisible();
    });
});
