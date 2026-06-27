import { expect, test } from "./fixtures/app.fixture";
import fs from "node:fs";

const readPngDimensions = (filePath: string) => {
    const buffer = fs.readFileSync(filePath);
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
};

test.describe("export", () => {
    test("exports PNG download", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(200, 200);

        const downloadPromise = page.waitForEvent("download");
        await page.getByTestId("tool-export").click();
        const download = await downloadPromise;
        await expect(download.suggestedFilename()).toMatch(/\.png$/i);
    });

    test("exports PNG cropped to content with padding", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(200, 200);

        const downloadPromise = page.waitForEvent("download");
        await page.getByTestId("tool-export").click();
        const download = await downloadPromise;
        const filePath = await download.path();
        if (!filePath) {
            throw new Error("Download path missing");
        }

        const { width, height } = readPngDimensions(filePath);

        expect(width).toBeLessThan(500);
        expect(height).toBeLessThan(500);
        expect(width).toBeGreaterThan(40);
        expect(height).toBeGreaterThan(40);
    });
});
