import { expect, test } from "./fixtures/app.fixture";
import { dragCanvas } from "./helpers/canvas";

test.describe("curved arrows", () => {
    test("draws arrow and adjusts curve via midpoint handle", async ({ page, whiteboard }) => {
        await whiteboard.drawArrow({ x: 150, y: 300 }, { x: 450, y: 300 });
        await dragCanvas(page, { x: 300, y: 300 }, { x: 300, y: 180 });

        await expect
            .poll(async () => {
                const arrow = await page.evaluate(() =>
                    window.__WHITEBOARD_TEST__?.objects?.find((item) => item.type === "arrow")
                );
                return Math.abs(arrow?.curveBend ?? 0);
            })
            .toBeGreaterThan(20);
    });

    test("draws line and adjusts curve via midpoint handle", async ({ page, whiteboard }) => {
        await whiteboard.drawLine({ x: 150, y: 400 }, { x: 450, y: 400 });
        await dragCanvas(page, { x: 300, y: 400 }, { x: 300, y: 280 });

        await expect
            .poll(async () => {
                const line = await page.evaluate(() =>
                    window.__WHITEBOARD_TEST__?.objects?.find((item) => item.type === "line")
                );
                return Math.abs(line?.curveBend ?? 0);
            })
            .toBeGreaterThan(20);
    });

    test("shows curve hint for line tool", async ({ page, whiteboard }) => {
        await whiteboard.selectTool("line");
        await expect(page.getByTestId("tool-hint")).toHaveText(
            "Drag from a shape anchor to connect, or draw freely on canvas"
        );
    });
});
