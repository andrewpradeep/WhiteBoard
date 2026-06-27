import { expect, test } from "./fixtures/app.fixture";
import { panCanvasWithSpace } from "./helpers/canvas";

test.describe("viewport", () => {
    test("zoom in, out, and fit", async ({ whiteboard }) => {
        await whiteboard.expectZoomPercent("100%");
        await whiteboard.zoomIn();
        await whiteboard.expectZoomPercent("110%");
        await whiteboard.zoomOut();
        await whiteboard.expectZoomPercent("100%");
        await whiteboard.zoomIn();
        await whiteboard.resetZoom();
        await whiteboard.expectZoomPercent("100%");
    });

    test("ctrl+wheel zooms canvas", async ({ page, whiteboard }) => {
        const canvas = whiteboard.canvas();
        await canvas.hover({ position: { x: 200, y: 200 } });
        await page.keyboard.down("Control");
        await page.mouse.wheel(0, -120);
        await page.keyboard.up("Control");
        await expect(whiteboard.zoomLabel()).not.toHaveText("100%");
    });

    test("space+drag pans viewport", async ({ page, whiteboard }) => {
        await whiteboard.selectTool("select");

        const offsetBefore = await page.evaluate(() => {
            return (window as Window & { __WHITEBOARD_TEST__?: { viewport?: { offsetX: number; offsetY: number } } })
                .__WHITEBOARD_TEST__?.viewport;
        });

        await panCanvasWithSpace(page, { x: 320, y: 240 }, { x: 520, y: 360 });

        await expect
            .poll(async () => {
                return page.evaluate(() => {
                    return (window as Window & {
                        __WHITEBOARD_TEST__?: { viewport?: { offsetX: number; offsetY: number } };
                    }).__WHITEBOARD_TEST__?.viewport;
                });
            })
            .not.toEqual(offsetBefore);
    });
});
