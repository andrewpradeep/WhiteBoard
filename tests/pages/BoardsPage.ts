import { Page, expect } from "@playwright/test";

export class BoardsPage {
    constructor(private readonly page: Page) {}

    activeTab = () => this.page.getByTestId("board-tab-active");
    addTab = () => this.page.getByTestId("board-tab-add");

    boardTabs = () => this.page.getByRole("tab");

    async createBoard() {
        const countBefore = await this.boardTabs().count();
        await this.addTab().click();
        await expect(this.boardTabs()).toHaveCount(countBefore + 1);
    }

    async switchToBoard(name: string) {
        await this.page.getByRole("tab", { name }).click();
        await expect(this.activeTab()).toHaveText(name);
    }

    async renameActiveBoard(name: string) {
        await this.activeTab().dblclick();
        const renameInput = this.page.locator(".board-rename-input");
        await expect(renameInput).toBeVisible();
        await renameInput.fill(name);
        await renameInput.press("Enter");
        await expect(this.activeTab()).toHaveText(name);
    }
}
