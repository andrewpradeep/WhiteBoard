import { expect, test } from "./fixtures/app.fixture";

test.describe("@mobile mobile layout", () => {
    test("@mobile bottom toolbar is usable and assistant is hidden on phones", async ({ page }) => {
        const toolbar = page.getByTestId("toolbar");
        await expect(toolbar).toBeVisible();

        const box = await toolbar.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
            expect(box.y).toBeGreaterThan(500);
        }

        await expect(page.getByTestId("assistant-launcher")).toHaveCount(0);
        await expect(page.getByTestId("assistant-panel")).toHaveCount(0);
        await expect(page.getByTestId("board-tab-active")).toBeVisible();
    });

    test("@mobile shape picker floats above the toolbar without overlapping it", async ({ page }) => {
        const toolbar = page.getByTestId("toolbar");
        await page.getByTestId("tool-shapes").click();

        const shapeList = page.getByTestId("shape-list");
        await expect(shapeList).toBeVisible();

        const toolbarBox = await toolbar.boundingBox();
        const shapeListBox = await shapeList.boundingBox();
        expect(toolbarBox).not.toBeNull();
        expect(shapeListBox).not.toBeNull();

        if (toolbarBox && shapeListBox) {
            expect(shapeListBox.y + shapeListBox.height).toBeLessThanOrEqual(toolbarBox.y + 1);
        }
    });
});
