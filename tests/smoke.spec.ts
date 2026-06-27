import { expect, test } from "./fixtures/app.fixture";

test.describe("@smoke", () => {
    test("@smoke app loads with default board", async ({ page, boards }) => {
        await expect(page.getByTestId("app-shell")).toBeVisible();
        await expect(page.getByTestId("toolbar")).toBeVisible();
        await expect(page.getByTestId("canvas")).toBeVisible();
        await expect(boards.activeTab()).toHaveText("Board 1");
    });

    test("@smoke draw rectangle on canvas", async ({ whiteboard }) => {
        await whiteboard.drawRectangleAt(200, 200);
        await whiteboard.expectObjects(1);
    });

    test("@smoke zoom in updates label", async ({ whiteboard }) => {
        await whiteboard.expectZoomPercent("100%");
        await whiteboard.zoomIn();
        await whiteboard.expectZoomPercent("110%");
    });
});
