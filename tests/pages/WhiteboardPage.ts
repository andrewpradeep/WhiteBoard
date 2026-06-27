import { Page, expect } from "@playwright/test";
import { clickCanvas, dragCanvas, expectObjectCount } from "../helpers/canvas";

export class WhiteboardPage {
    constructor(private readonly page: Page) {}

    canvas = () => this.page.getByTestId("canvas");
    zoomLabel = () => this.page.getByTestId("zoom-label");
    shapeList = () => this.page.getByTestId("shape-list");

    async selectTool(tool: string) {
        await this.page.getByTestId(`tool-${tool.toLowerCase()}`).click();
    }

    async waitForDrawingMode() {
        await expect(this.canvas()).toHaveClass(/click-pointer/);
    }

    async openShapeList() {
        const shapesButton = this.page.getByTestId("tool-shapes");
        if ((await this.shapeList().count()) === 0) {
            await shapesButton.click();
        }
        await expect(this.shapeList()).toBeVisible();
    }

    async pickShape(testId: string) {
        await this.page.getByTestId(testId).click();
        await this.waitForDrawingMode();
    }

    async pickShapeFromList(index: number) {
        const shapes = [
            "shape-pick-rect",
            "shape-pick-circle",
            "shape-pick-oval",
            "shape-pick-triangle",
            "shape-pick-star",
        ];
        await this.pickShape(shapes[index]);
    }

    async drawRectangleAt(x: number, y: number) {
        await this.openShapeList();
        await this.pickShape("shape-pick-rect");
        await clickCanvas(this.page, x, y);
    }

    async drawLine(from: { x: number; y: number }, to: { x: number; y: number }) {
        await this.selectTool("line");
        await this.waitForDrawingMode();
        await dragCanvas(this.page, from, to);
    }

    async drawArrow(from: { x: number; y: number }, to: { x: number; y: number }) {
        await this.selectTool("arrow");
        await this.waitForDrawingMode();
        await dragCanvas(this.page, from, to);
    }

    async drawScribble(from: { x: number; y: number }, to: { x: number; y: number }) {
        await this.selectTool("draw");
        await this.waitForDrawingMode();
        await dragCanvas(this.page, from, to);
    }

    async addTextBox(x: number, y: number, text: string) {
        await this.selectTool("text");
        await clickCanvas(this.page, x, y);
        const editor = this.page.getByLabel("Text box editor");
        await expect(editor).toBeVisible();
        await editor.fill(text);
    }

    async zoomIn() {
        await this.page.getByRole("button", { name: "Zoom in" }).click();
    }

    async zoomOut() {
        await this.page.getByRole("button", { name: "Zoom out" }).click();
    }

    async resetZoom() {
        await this.page.getByRole("button", { name: "Reset zoom" }).click();
    }

    async expectZoomPercent(label: string) {
        await expect(this.zoomLabel()).toHaveText(label);
    }

    async expectObjects(count: number) {
        await expectObjectCount(this.page, count);
    }
}
