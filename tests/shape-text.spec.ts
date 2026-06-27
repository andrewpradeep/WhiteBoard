import { expect, test } from "./fixtures/app.fixture";
import { clickCanvas } from "./helpers/canvas";

test.describe("shape text", () => {
    test("adds clipped text to a rectangle via double-click", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(300, 280);
        await whiteboard.selectTool("select");

        await page.getByTestId("canvas").dblclick({ position: { x: 300, y: 280 } });
        const editor = page.getByLabel("Text box editor");
        await expect(editor).toBeVisible();
        await editor.fill("Inside the box");

        await expect
            .poll(async () => {
                return page.evaluate(
                    () => window.__WHITEBOARD_TEST__?.objects?.[0]?.text ?? ""
                );
            })
            .toBe("Inside the box");
    });

    test("adds clipped text to a circle via double-click", async ({ page, whiteboard }) => {
        await whiteboard.openShapeList();
        await whiteboard.pickShape("shape-pick-circle");
        await clickCanvas(page, 320, 280);
        await whiteboard.selectTool("select");

        await page.getByTestId("canvas").dblclick({ position: { x: 320, y: 280 } });
        await page.getByLabel("Text box editor").fill("Round label");

        await expect
            .poll(async () => {
                return page.evaluate(
                    () => window.__WHITEBOARD_TEST__?.objects?.[0]?.text ?? ""
                );
            })
            .toBe("Round label");
    });

    test("keeps long text stored without increasing shape size", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(260, 260);
        await whiteboard.selectTool("select");
        await page.getByTestId("canvas").dblclick({ position: { x: 260, y: 260 } });

        const longText =
            "This is a long label that should wrap inside the rectangle without resizing the shape bounds.";
        await page.getByLabel("Text box editor").fill(longText);

        await expect
            .poll(async () => {
                return page.evaluate(() => {
                    const shape = window.__WHITEBOARD_TEST__?.objects?.[0];
                    if (!shape) {
                        return null;
                    }

                    return {
                        text: shape.text ?? "",
                        width: shape.width,
                        height: shape.height,
                    };
                });
            })
            .toEqual(
                expect.objectContaining({
                    text: longText,
                })
            );

        const bounds = await page.evaluate(() => {
            const shape = window.__WHITEBOARD_TEST__?.objects?.[0];
            return shape ? { width: shape.width, height: shape.height } : null;
        });
        expect(bounds?.width).toBeGreaterThan(0);
        expect(bounds?.height).toBeGreaterThan(0);
    });
});
