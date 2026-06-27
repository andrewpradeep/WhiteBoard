import { expect, test } from "./fixtures/app.fixture";
import { clickCanvas } from "./helpers/canvas";

test.describe("shape popover flow", () => {
    test("opens shape list when Shapes is clicked", async ({ page }) => {
        await page.getByTestId("tool-shapes").click();
        await expect(page.getByTestId("shape-list")).toBeVisible();
        await expect(page.getByTestId("shape-pick-rect")).toBeVisible();
        await expect(page.getByTestId("shape-pick-circle")).toBeVisible();
    });

    test("toggles shape list closed when Shapes is clicked again", async ({ page }) => {
        const shapesButton = page.getByTestId("tool-shapes");
        await shapesButton.click();
        await expect(page.getByTestId("shape-list")).toBeVisible();
        await shapesButton.click();
        await expect(page.getByTestId("shape-list")).toHaveCount(0);
    });

    test("keeps popover open after picking rectangle", async ({ page }) => {
        await page.getByTestId("tool-shapes").click();
        await page.getByTestId("shape-pick-rect").click();
        await expect(page.getByTestId("shape-list")).toBeVisible();
        await expect(page.getByTestId("canvas")).toHaveClass(/click-pointer/);
    });

    test("places rectangle after Shapes → Rectangle → canvas click", async ({ page, whiteboard }) => {
        await page.getByTestId("tool-shapes").click();
        await page.getByTestId("shape-pick-rect").click();
        await expect(page.getByTestId("tool-hint")).toHaveText("Click canvas to place shape");
        await clickCanvas(page, 320, 280);
        await whiteboard.expectObjects(1);
    });

    test("places multiple shapes via popover without reopening", async ({ page, whiteboard }) => {
        await page.getByTestId("tool-shapes").click();
        await expect(page.getByTestId("shape-list")).toBeVisible();

        await page.getByTestId("shape-pick-rect").click();
        await clickCanvas(page, 200, 200);
        await whiteboard.expectObjects(1);
        await expect(page.getByTestId("shape-list")).toBeVisible();

        await page.getByTestId("shape-pick-circle").click();
        await expect(page.getByTestId("shape-list")).toBeVisible();
        await clickCanvas(page, 400, 200);
        await whiteboard.expectObjects(2);
    });

    test("closes popover when Select is clicked", async ({ page }) => {
        await page.getByTestId("tool-shapes").click();
        await expect(page.getByTestId("shape-list")).toBeVisible();
        await page.getByTestId("tool-select").click();
        await expect(page.getByTestId("shape-list")).toHaveCount(0);
    });
});
