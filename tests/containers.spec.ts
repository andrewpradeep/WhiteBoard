import { expect, test } from "./fixtures/app.fixture";
import { clickCanvas, dragCanvas } from "./helpers/canvas";

test.describe("containers", () => {
    test("adds a container from the shape picker", async ({ page, whiteboard }) => {
        await page.getByTestId("tool-shapes").click();
        await page.getByTestId("shape-pick-container").click();
        await clickCanvas(page, 280, 260);
        await whiteboard.expectObjects(1);

        const container = await page.evaluate(() =>
            window.__WHITEBOARD_TEST__?.objects?.find((item) => item.type === "container")
        );
        expect(container).toBeTruthy();
    });

    test("places shapes inside a container and moves them together", async ({ page, whiteboard }) => {
        await page.getByTestId("tool-shapes").click();
        await page.getByTestId("shape-pick-container").click();
        await clickCanvas(page, 220, 200);
        await whiteboard.expectObjects(1);

        await page.getByTestId("shape-pick-circle").click();
        await clickCanvas(page, 280, 260);
        await page.getByTestId("shape-pick-rect").click();
        await clickCanvas(page, 340, 280);
        await whiteboard.expectObjects(3);

        const membership = await page.evaluate(() => {
            const objects = window.__WHITEBOARD_TEST__?.objects ?? [];
            const container = objects.find((item) => item.type === "container");
            return {
                childIds: container?.childIds ?? [],
                childParentIds: objects
                    .filter((item) => item.type !== "container")
                    .map((item) => item.parentId),
            };
        });

        expect(membership.childIds).toHaveLength(2);
        expect(membership.childParentIds.every(Boolean)).toBe(true);

        const beforeMove = await page.evaluate(() => {
            const objects = window.__WHITEBOARD_TEST__?.objects ?? [];
            return objects.map((item) => ({ id: item.id, x: item.x, y: item.y }));
        });

        await page.getByTestId("tool-select").click();
        await dragCanvas(page, { x: 240, y: 220 }, { x: 420, y: 320 });

        const afterMove = await page.evaluate(() => {
            const objects = window.__WHITEBOARD_TEST__?.objects ?? [];
            return objects.map((item) => ({ id: item.id, x: item.x, y: item.y }));
        });

        beforeMove.forEach((beforeObject) => {
            const afterObject = afterMove.find((item) => item.id === beforeObject.id);
            expect(afterObject).toBeTruthy();
            expect(afterObject!.x).not.toBe(beforeObject.x);
            expect(afterObject!.y).not.toBe(beforeObject.y);
        });
    });

    test("drags a child out of a container", async ({ page, whiteboard }) => {
        await page.getByTestId("tool-shapes").click();
        await page.getByTestId("shape-pick-container").click();
        await clickCanvas(page, 220, 200);
        await whiteboard.expectObjects(1);

        await page.getByTestId("shape-pick-circle").click();
        await clickCanvas(page, 280, 260);
        await page.getByTestId("shape-pick-rect").click();
        await clickCanvas(page, 340, 280);
        await whiteboard.expectObjects(3);

        const circleId = await page.evaluate(() => {
            const objects = window.__WHITEBOARD_TEST__?.objects ?? [];
            const circle = objects.find((item) => item.type === "circle");
            return circle?.id ?? null;
        });
        expect(circleId).toBeTruthy();

        const beforeDetach = await page.evaluate((id) => {
            const objects = window.__WHITEBOARD_TEST__?.objects ?? [];
            const container = objects.find((item) => item.type === "container");
            const circle = objects.find((item) => item.id === id);
            return {
                childIds: container?.childIds ?? [],
                parentId: circle?.parentId,
                circleX: circle?.x,
                circleY: circle?.y,
            };
        }, circleId);

        expect(beforeDetach.childIds).toContain(circleId);
        expect(beforeDetach.parentId).toBeTruthy();

        await page.getByTestId("tool-select").click();
        await dragCanvas(page, { x: 280, y: 260 }, { x: 600, y: 260 });

        const afterDetach = await page.evaluate((id) => {
            const objects = window.__WHITEBOARD_TEST__?.objects ?? [];
            const container = objects.find((item) => item.type === "container");
            const circle = objects.find((item) => item.id === id);
            return {
                childIds: container?.childIds ?? [],
                parentId: circle?.parentId,
                circleX: circle?.x,
                circleY: circle?.y,
            };
        }, circleId);

        expect(afterDetach.parentId).toBeUndefined();
        expect(afterDetach.childIds).not.toContain(circleId);
        expect(afterDetach.circleX).not.toBe(beforeDetach.circleX);

        const circlePositionBeforeContainerMove = afterDetach.circleX;
        await dragCanvas(page, { x: 240, y: 220 }, { x: 420, y: 320 });

        const afterContainerMove = await page.evaluate((id) => {
            const circle = window.__WHITEBOARD_TEST__?.objects?.find((item) => item.id === id);
            return { circleX: circle?.x, circleY: circle?.y };
        }, circleId);

        expect(afterContainerMove.circleX).toBe(circlePositionBeforeContainerMove);
    });

    test("selects a child shape instead of the container when clicking on both", async ({ page, whiteboard }) => {
        await page.getByTestId("tool-shapes").click();
        await page.getByTestId("shape-pick-container").click();
        await clickCanvas(page, 220, 200);
        await whiteboard.expectObjects(1);

        await page.getByTestId("shape-pick-circle").click();
        await clickCanvas(page, 280, 260);
        await whiteboard.expectObjects(2);

        const circleId = await page.evaluate(() => {
            const circle = window.__WHITEBOARD_TEST__?.objects?.find((item) => item.type === "circle");
            return circle?.id ?? null;
        });
        const containerId = await page.evaluate(() => {
            const container = window.__WHITEBOARD_TEST__?.objects?.find((item) => item.type === "container");
            return container?.id ?? null;
        });
        expect(circleId).toBeTruthy();
        expect(containerId).toBeTruthy();

        await page.getByTestId("tool-select").click();
        await clickCanvas(page, 280, 260);

        const selectedObjectId = await page.evaluate(
            () => window.__WHITEBOARD_TEST__?.selectedObjectId ?? null
        );
        expect(selectedObjectId).toBe(circleId);
        expect(selectedObjectId).not.toBe(containerId);
    });
});
