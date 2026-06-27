import { Page, expect } from "@playwright/test";

export const resetIndexedDb = async (page: Page) => {
    await page.evaluate(async () => {
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase("creamboard-v3");
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => resolve();
        });
    });
};

export const gotoFreshApp = async (page: Page) => {
    await page.goto("/");
    await resetIndexedDb(page);
    await page.reload();
    await page.getByTestId("app-shell").waitFor({ state: "visible" });
};

export const readPersistedBoardCount = async (page: Page) => {
    return page.evaluate(async () => {
        return new Promise<number>((resolve) => {
            const request = indexedDB.open("creamboard-v3", 1);
            request.onerror = () => resolve(0);
            request.onsuccess = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains("whiteboard-state")) {
                    database.close();
                    resolve(0);
                    return;
                }

                const transaction = database.transaction("whiteboard-state", "readonly");
                const store = transaction.objectStore("whiteboard-state");
                const getRequest = store.get("current");
                getRequest.onsuccess = () => {
                    const state = getRequest.result as { boards?: unknown[] } | undefined;
                    resolve(Array.isArray(state?.boards) ? state.boards.length : 0);
                };
                getRequest.onerror = () => resolve(0);
                transaction.oncomplete = () => database.close();
            };
        });
    });
};

export const waitForPersistedBoardCount = async (page: Page, count: number) => {
    await expect
        .poll(async () => readPersistedBoardCount(page), { timeout: 5000 })
        .toBeGreaterThanOrEqual(count);
};
