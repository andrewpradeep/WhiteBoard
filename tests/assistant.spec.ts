import { expect, test } from "./fixtures/app.fixture";

test.describe("assistant", () => {
    test("opens with intro-only welcome on an empty board", async ({ assistant, page }) => {
        await assistant.open();
        const intro = page.locator(".chat-message.assistant.guide").first();
        await expect(intro).toContainText("draw a house");
        await expect(intro).not.toContainText("20px left of rect2");
        await expect(page.locator(".chat-message.assistant")).toHaveCount(1);
        await assistant.close();
        await expect(page.getByTestId("assistant-launcher")).toBeVisible();
    });

    test("shows placement guide when board already has shapes", async ({ assistant, whiteboard, page }) => {
        await whiteboard.drawRectangleAt(240, 180);
        await assistant.open();

        await expect(page.locator(".chat-message.assistant")).toHaveCount(2);
        await expect(page.locator(".chat-message.assistant.guide").first()).toContainText("draw a house");
        await expect(page.locator(".chat-message.assistant.guide").nth(1)).toContainText(
            "20px left of rect2"
        );
    });

    test("shows placement guide after first shape is added while chat is open", async ({
        assistant,
        whiteboard,
        page,
    }) => {
        await assistant.open();
        await expect(page.locator(".chat-message.assistant")).toHaveCount(1);

        await whiteboard.drawRectangleAt(240, 180);

        await expect(page.locator(".chat-message.assistant")).toHaveCount(2);
        await expect(page.locator(".chat-message.assistant.guide").nth(1)).toContainText(
            "relative to them"
        );
    });

    test("pattern command adds composite shapes", async ({ assistant, whiteboard, page }) => {
        await assistant.open();
        await assistant.send("draw a house");
        await assistant.expectAssistantMessage(/Added 2 shapes/i);
        await whiteboard.expectObjects(3);

        const membership = await page.evaluate(() => {
            const objects = window.__WHITEBOARD_TEST__?.objects ?? [];
            const container = objects.find((item) => item.type === "container");
            const childShapes = objects.filter(
                (item) => item.type !== "container" && item.type !== "line"
            );
            return {
                containerChildIds: container?.childIds ?? [],
                childParentIds: childShapes.map((item) => item.parentId),
            };
        });

        expect(membership.containerChildIds).toHaveLength(2);
        expect(membership.childParentIds.every(Boolean)).toBe(true);
    });

    test("simple shape command adds a shape on an empty board", async ({ assistant, whiteboard, page }) => {
        await assistant.open();
        await assistant.send("draw a rectangle");
        await assistant.expectAssistantMessage(/Added 1 shape/i);
        await whiteboard.expectObjects(1);

        const hasContainer = await page.evaluate(
            () => window.__WHITEBOARD_TEST__?.objects?.some((item) => item.type === "container") ?? false
        );
        expect(hasContainer).toBe(false);
    });

    test("misspelled shape commands still add shapes", async ({ assistant, whiteboard }) => {
        await assistant.open();
        await assistant.send("draw a curcle");
        await assistant.expectAssistantMessage(/Added 1 shape/i);
        await whiteboard.expectObjects(1);

        await assistant.send("draw a curcle");
        await assistant.expectAssistantMessage(/Added 1 shape/i);
        await whiteboard.expectObjects(2);
    });

    test("relative command on empty board shows helpful hint", async ({ assistant }) => {
        await assistant.open();
        await assistant.send("add a circle right of rect1");
        await assistant.expectAssistantMessage(/Add a shape first/i);
    });

    test("model consent appears before first inference command", async ({ assistant, whiteboard, page }) => {
        await whiteboard.drawRectangleAt(240, 180);
        await assistant.open();
        await assistant.send("add a hexagon");

        await assistant.expectModelConsent();
        await expect(page.getByTestId("assistant-input")).toBeDisabled();
    });

    test("cancelled model download does not start loading overlay", async ({
        assistant,
        whiteboard,
        page,
    }) => {
        await whiteboard.drawRectangleAt(240, 180);
        await assistant.open();
        await assistant.send("add a hexagon");

        await assistant.expectModelConsent();
        await assistant.cancelModelDownload();

        await expect(page.getByTestId("model-loading-overlay")).toHaveCount(0);
        await assistant.expectAssistantMessage(/cancelled/i);
        await expect(page.getByTestId("assistant-input")).toBeEnabled();
    });

    test("confirmed model download shows loading overlay and disables input", async ({
        assistant,
        whiteboard,
        page,
    }) => {
        test.setTimeout(120_000);

        await whiteboard.drawRectangleAt(240, 180);
        await assistant.open();
        await assistant.send("add a hexagon");

        await assistant.expectModelConsent();
        await assistant.confirmModelDownload();
        await assistant.expectLoadingOverlay();
        await expect(page.getByTestId("assistant-input")).toBeDisabled();
    });

    test("skips model consent when session consent is already granted", async ({
        assistant,
        whiteboard,
        page,
    }) => {
        test.setTimeout(120_000);

        await whiteboard.drawRectangleAt(240, 180);
        await assistant.open();
        await assistant.grantModelConsentInSession();
        await assistant.send("add a hexagon");

        await expect(page.getByTestId("model-consent-card")).toHaveCount(0);
        await assistant.expectLoadingOverlay();
    });

    test("shows element labels on the canvas when assistant opens", async ({ assistant, whiteboard, page }) => {
        await whiteboard.drawRectangleAt(240, 180);
        await assistant.open();

        await expect
            .poll(() => page.evaluate(() => window.__WHITEBOARD_TEST__?.showElementNames))
            .toBe(true);

        await expect
            .poll(() =>
                page.evaluate(
                    () => window.__WHITEBOARD_TEST__?.objects?.find((item) => item.displayName === "rect1")?.displayName
                )
            )
            .toBe("rect1");
    });

    test("toggle hides element labels on the canvas", async ({ assistant, whiteboard, page }) => {
        await whiteboard.drawRectangleAt(240, 180);
        await assistant.open();

        await expect
            .poll(() => page.evaluate(() => window.__WHITEBOARD_TEST__?.showElementNames))
            .toBe(true);

        await page.getByTestId("toggle-element-names").click();

        await expect
            .poll(() => page.evaluate(() => window.__WHITEBOARD_TEST__?.showElementNames))
            .toBe(false);
    });
});
