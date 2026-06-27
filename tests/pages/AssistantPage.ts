import { Page, expect } from "@playwright/test";

export class AssistantPage {
    constructor(private readonly page: Page) {}

    async open() {
        await this.page.getByTestId("assistant-launcher").click();
        await expect(this.page.getByTestId("assistant-panel")).toBeVisible();
    }

    async close() {
        await this.page.getByRole("button", { name: "Collapse assistant" }).click();
        await expect(this.page.getByTestId("assistant-panel")).toBeHidden();
    }

    async send(command: string) {
        await this.page.getByTestId("assistant-input").fill(command);
        await this.page.getByRole("button", { name: "Send command" }).click();
    }

    async expectAssistantMessage(matcher: RegExp | string) {
        await expect(
            this.page.locator(".chat-message.assistant").filter({ hasText: matcher }).last()
        ).toBeVisible();
    }

    async expectModelConsent() {
        await expect(this.page.getByTestId("model-consent-card")).toBeVisible();
    }

    async confirmModelDownload() {
        await this.page.getByTestId("model-consent-confirm").click();
        await expect(this.page.getByTestId("model-consent-card")).toBeHidden();
    }

    async cancelModelDownload() {
        await this.page.getByTestId("model-consent-cancel").click();
        await expect(this.page.getByTestId("model-consent-card")).toBeHidden();
    }

    async expectLoadingOverlay() {
        await expect(this.page.getByTestId("model-loading-overlay")).toBeVisible();
    }

    async grantModelConsentInSession() {
        await this.page.evaluate(() => {
            sessionStorage.setItem("whiteboard.modelConsent.v1", "true");
        });
    }
}
