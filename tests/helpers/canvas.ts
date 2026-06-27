import { Page, expect } from "@playwright/test";

export const getObjectCount = async (page: Page) => {
    return page.evaluate(() => {
        return (window as Window & { __WHITEBOARD_TEST__?: { objectCount: number } })
            .__WHITEBOARD_TEST__?.objectCount;
    });
};

export const expectObjectCount = async (page: Page, count: number) => {
    await expect.poll(async () => getObjectCount(page)).toBe(count);
};

export const sampleCanvasPixel = async (
    page: Page,
    x: number,
    y: number,
    selector = '[data-testid="canvas"]'
) => {
    return page.evaluate(
        ({ sampleX, sampleY, canvasSelector }) => {
            const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement | null;
            if (!canvas) {
                return null;
            }
            const context = canvas.getContext("2d");
            if (!context) {
                return null;
            }
            const data = context.getImageData(sampleX, sampleY, 1, 1).data;
            return { r: data[0], g: data[1], b: data[2], a: data[3] };
        },
        { sampleX: x, sampleY: y, canvasSelector: selector }
    );
};

export const canvasHasInk = async (page: Page, x: number, y: number) => {
    const pixel = await sampleCanvasPixel(page, x, y);
    if (!pixel) {
        return false;
    }
    return pixel.r < 250 || pixel.g < 250 || pixel.b < 250;
};

export const clickCanvas = async (page: Page, x: number, y: number) => {
    const canvas = page.getByTestId("canvas");
    await canvas.click({ position: { x, y } });
};

export const dragCanvas = async (
    page: Page,
    from: { x: number; y: number },
    to: { x: number; y: number }
) => {
    const canvas = page.getByTestId("canvas");
    const box = await canvas.boundingBox();
    if (!box) {
        throw new Error("Canvas bounding box not found");
    }

    await page.mouse.move(box.x + from.x, box.y + from.y);
    await page.mouse.down();
    await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 8 });
    await page.mouse.up();
};

export const panCanvasWithSpace = async (
    page: Page,
    from: { x: number; y: number },
    to: { x: number; y: number }
) => {
    const canvas = page.getByTestId("canvas");
    await canvas.focus();
    await page.keyboard.down("Space");
    await canvas.hover({ position: from, force: true });
    await page.mouse.down();
    await canvas.hover({ position: to, force: true });
    await page.mouse.up();
    await page.keyboard.up("Space");
};
