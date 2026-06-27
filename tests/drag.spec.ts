import { expect, test } from "./fixtures/app.fixture";
import { dragCanvas } from "./helpers/canvas";

test.describe("drag interactions", () => {
    test("drags a selected shape in select mode", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(200, 200);
        await whiteboard.selectTool("select");

        const start = await page.evaluate(() => window.__WHITEBOARD_TEST__?.objects?.[0]);
        expect(start).toBeTruthy();

        await dragCanvas(page, { x: 200, y: 200 }, { x: 320, y: 280 });

        await expect
            .poll(async () => {
                const current = await page.evaluate(() => window.__WHITEBOARD_TEST__?.objects?.[0]);
                if (!current || !start) {
                    return false;
                }

                return (
                    Math.abs(current.x - start.x) > 10 ||
                    Math.abs(current.y - start.y) > 10
                );
            })
            .toBe(true);
    });

    test("pans viewport when dragging empty canvas in select mode", async ({ page, whiteboard }) => {
        await whiteboard.selectTool("select");

        const start = await page.evaluate(() => window.__WHITEBOARD_TEST__?.viewport);
        expect(start).toBeTruthy();

        await dragCanvas(page, { x: 500, y: 350 }, { x: 700, y: 470 });

        await expect
            .poll(async () => {
                const current = await page.evaluate(() => window.__WHITEBOARD_TEST__?.viewport);
                if (!current || !start) {
                    return false;
                }

                return (
                    Math.abs(current.offsetX - start.offsetX) > 10 ||
                    Math.abs(current.offsetY - start.offsetY) > 10
                );
            })
            .toBe(true);
    });
});
