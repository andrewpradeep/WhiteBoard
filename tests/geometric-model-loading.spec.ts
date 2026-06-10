import { expect, test } from "@playwright/test";

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

test("debug geometric chat model asset loading", async ({ page }) => {
    const modelRequests: string[] = [];
    const modelResponses: string[] = [];
    const htmlFallbackResponses: string[] = [];
    const failedRequests: string[] = [];
    const consoleMessages: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (message) => {
        consoleMessages.push(`[${message.type()}] ${message.text()}`);
    });

    page.on("pageerror", (error) => {
        pageErrors.push(error.stack ?? error.message);
    });

    page.on("request", (request) => {
        const url = request.url();
        if (isModelOrRuntimeAsset(url)) {
            modelRequests.push(`${request.method()} ${url}`);
        }
    });

    page.on("response", (response) => {
        const url = response.url();
        if (isModelOrRuntimeAsset(url)) {
            const contentType = response.headers()["content-type"] ?? "unknown content-type";
            modelResponses.push(`${response.status()} ${contentType} ${url}`);
            if (contentType.includes("text/html")) {
                htmlFallbackResponses.push(`${response.status()} ${contentType} ${url}`);
            }
        }
    });

    page.on("requestfailed", (request) => {
        failedRequests.push(`${request.failure()?.errorText ?? "failed"} ${request.url()}`);
    });

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Chat" })).toBeVisible();

    await page.getByRole("button", { name: /Shapes/i }).click();
    await page.locator(".shape-list-container .icon-container").first().click();

    const canvas = page.locator("#white_board");
    await expect(canvas).toBeVisible();
    await canvas.click({
        position: {
            x: 240,
            y: 180,
        },
    });

    await page.getByRole("button", { name: "Open geometric chat" }).click();
    await page.getByLabel("Chat command").fill("add a circle to the right of the rectangle");
    await page.getByRole("button", { name: "Send" }).click();

    await expect
        .poll(() => modelRequests.length, {
            message: "Expected the client to request local model or ONNX runtime assets.",
            timeout: 45_000,
        })
        .toBeGreaterThan(0);

    await expect(page.locator(".chat-message.assistant.pending")).toHaveCount(0, {
        timeout: 90_000,
    });

    console.log("\n--- Model/runtime requests ---");
    console.log(modelRequests.length ? modelRequests.join("\n") : "No model/runtime requests recorded.");

    console.log("\n--- Model/runtime responses ---");
    console.log(modelResponses.length ? modelResponses.join("\n") : "No model/runtime responses recorded.");

    console.log("\n--- HTML fallback responses ---");
    console.log(htmlFallbackResponses.length ? htmlFallbackResponses.join("\n") : "No HTML fallbacks recorded.");

    console.log("\n--- Failed requests ---");
    console.log(failedRequests.length ? failedRequests.join("\n") : "No failed requests recorded.");

    console.log("\n--- Browser console ---");
    console.log(consoleMessages.length ? consoleMessages.join("\n") : "No console messages recorded.");

    console.log("\n--- Page errors ---");
    console.log(pageErrors.length ? pageErrors.join("\n") : "No page errors recorded.");

    expect(
        htmlFallbackResponses,
        "Model/runtime asset URLs should resolve to real files, not Vite HTML fallback responses."
    ).toEqual([]);
    await expect(page.getByText(/I could not run inference/i)).toHaveCount(0);
    await expect(page.getByText(/Added 1 generated shape to the board\./i)).toBeVisible();
    await expect(page.getByText(/Added 2 generated shapes to the board\./i)).toHaveCount(0);
});
