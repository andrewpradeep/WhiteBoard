import { expect, test } from "./fixtures/app.fixture";
import { waitForPersistedBoardCount } from "./helpers/storage";

test.describe("boards", () => {
    test("creates a new board tab", async ({ page, boards }) => {
        await boards.createBoard();
        await expect(boards.activeTab()).toHaveText("Board 2");
    });

    test("isolates content between boards", async ({ page, boards, whiteboard }) => {
        await whiteboard.drawRectangleAt(180, 180);
        await whiteboard.expectObjects(1);

        await boards.createBoard();
        await whiteboard.expectObjects(0);

        await boards.switchToBoard("Board 1");
        await whiteboard.expectObjects(1);
    });

    test("renames active board", async ({ boards }) => {
        await boards.renameActiveBoard("Design");
        await expect(boards.activeTab()).toHaveText("Design");
    });

    test("persists boards after reload", async ({ page, boards }) => {
        await boards.createBoard();
        await expect(boards.activeTab()).toHaveText("Board 2");
        await waitForPersistedBoardCount(page, 2);

        await page.reload();
        await page.getByTestId("app-shell").waitFor({ state: "visible" });
        await expect(page.getByRole("tab")).toHaveCount(2);
        await expect(page.getByRole("tab", { name: "Board 2" })).toBeVisible();
    });
});
