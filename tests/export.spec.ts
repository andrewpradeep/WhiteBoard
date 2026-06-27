import { expect, test } from "./fixtures/app.fixture";

test.describe("export", () => {
    test("exports PNG download", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(200, 200);

        const downloadPromise = page.waitForEvent("download");
        await page.getByTestId("tool-export").click();
        const download = await downloadPromise;
        await expect(download.suggestedFilename()).toMatch(/\.png$/i);
    });
});
