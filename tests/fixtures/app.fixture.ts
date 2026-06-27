import { test as base } from "@playwright/test";
import { gotoFreshApp } from "../helpers/storage";
import { AssistantPage } from "../pages/AssistantPage";
import { BoardsPage } from "../pages/BoardsPage";
import { WhiteboardPage } from "../pages/WhiteboardPage";

type AppFixtures = {
    whiteboard: WhiteboardPage;
    boards: BoardsPage;
    assistant: AssistantPage;
};

export const test = base.extend<AppFixtures>({
    page: async ({ page }, use) => {
        await gotoFreshApp(page);
        await use(page);
    },
    whiteboard: async ({ page }, use) => {
        await use(new WhiteboardPage(page));
    },
    boards: async ({ page }, use) => {
        await use(new BoardsPage(page));
    },
    assistant: async ({ page }, use) => {
        await use(new AssistantPage(page));
    },
});

export { expect } from "@playwright/test";
