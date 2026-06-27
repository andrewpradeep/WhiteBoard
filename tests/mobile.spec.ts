import { expect, test } from "./fixtures/app.fixture";

test.describe("@mobile mobile layout", () => {
    test("@mobile bottom toolbar and assistant are usable", async ({ page, assistant }) => {
        const toolbar = page.getByTestId("toolbar");
        await expect(toolbar).toBeVisible();

        const box = await toolbar.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
            expect(box.y).toBeGreaterThan(500);
        }

        await assistant.open();
        await expect(page.getByTestId("assistant-input")).toBeVisible();
        await expect(page.getByTestId("board-tab-active")).toBeVisible();
    });
});
