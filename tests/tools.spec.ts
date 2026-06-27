import { expect, test } from "./fixtures/app.fixture";
import { clickCanvas } from "./helpers/canvas";

test.describe("tools", () => {
    test("draws rectangle and circle from shape list", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(160, 160);
        await whiteboard.openShapeList();
        await whiteboard.pickShape("shape-pick-circle");
        await clickCanvas(page, 320, 160);
        await whiteboard.expectObjects(2);
    });

    test("draws line and arrow", async ({ whiteboard }) => {
        await whiteboard.drawLine({ x: 180, y: 180 }, { x: 320, y: 260 });
        await whiteboard.expectObjects(1);

        await whiteboard.drawArrow({ x: 200, y: 320 }, { x: 420, y: 380 });
        await whiteboard.expectObjects(2);
    });

    test("draws scribble path", async ({ whiteboard }) => {
        await whiteboard.drawScribble({ x: 100, y: 100 }, { x: 260, y: 180 });
        await whiteboard.expectObjects(1);
    });

    test("adds text box content", async ({ whiteboard }) => {
        await whiteboard.addTextBox(400, 300, "Hello");
        await whiteboard.expectObjects(1);
    });

    test("eraser removes shape under pointer", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(200, 200);
        await whiteboard.expectObjects(1);

        await whiteboard.selectTool("erase");
        await clickCanvas(page, 200, 200);
        await whiteboard.expectObjects(0);
    });

    test("delete key removes selected shape", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(200, 200);
        await whiteboard.selectTool("select");
        await clickCanvas(page, 200, 200);
        await page.keyboard.press("Backspace");
        await whiteboard.expectObjects(0);
    });
});
