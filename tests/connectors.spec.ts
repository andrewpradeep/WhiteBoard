import { expect, test } from "./fixtures/app.fixture";
import { dragCanvas } from "./helpers/canvas";

type AnchorSide = "top" | "right" | "bottom" | "left";

const getAnchorCanvasPosition = async (
    page: import("@playwright/test").Page,
    objectIndex: number,
    side: AnchorSide
) => {
    return page.evaluate(
        ({ index, anchorSide }) => {
            const objects = window.__WHITEBOARD_TEST__?.objects;
            const canvas = document.querySelector('[data-testid="canvas"]') as HTMLCanvasElement | null;
            const object = objects?.[index];

            if (!objects || !canvas || !object) {
                return null;
            }

            const bounds = canvas.getBoundingClientRect();
            const scale = window.__WHITEBOARD_TEST__?.viewport?.scale ?? 1;
            const offsetX = window.__WHITEBOARD_TEST__?.viewport?.offsetX ?? 0;
            const offsetY = window.__WHITEBOARD_TEST__?.viewport?.offsetY ?? 0;
            const displayScale = canvas.width / bounds.width;
            const width = object.width ?? 0;
            const height = object.height ?? 0;
            const radius = object.radius ?? 0;

            let worldX = object.x;
            let worldY = object.y;

            if (object.type === "circle") {
                switch (anchorSide) {
                    case "top":
                        worldX = object.x;
                        worldY = object.y - radius;
                        break;
                    case "bottom":
                        worldX = object.x;
                        worldY = object.y + radius;
                        break;
                    case "left":
                        worldX = object.x - radius;
                        worldY = object.y;
                        break;
                    case "right":
                        worldX = object.x + radius;
                        worldY = object.y;
                        break;
                }
            } else {
                switch (anchorSide) {
                    case "top":
                        worldX = object.x + width / 2;
                        worldY = object.y;
                        break;
                    case "bottom":
                        worldX = object.x + width / 2;
                        worldY = object.y + height;
                        break;
                    case "left":
                        worldX = object.x;
                        worldY = object.y + height / 2;
                        break;
                    case "right":
                        worldX = object.x + width;
                        worldY = object.y + height / 2;
                        break;
                }
            }

            return {
                x: (worldX * scale + offsetX) / displayScale,
                y: (worldY * scale + offsetY) / displayScale,
            };
        },
        { index: objectIndex, anchorSide: side }
    );
};

test.describe("shape connectors", () => {
    test("renders connected shapes without runtime errors", async ({ page, whiteboard }) => {
        const runtimeErrors: string[] = [];
        page.on("pageerror", (error) => runtimeErrors.push(error.message));

        await whiteboard.drawRectangleAt(180, 250);
        await whiteboard.drawRectangleAt(520, 250);

        const from = await getAnchorCanvasPosition(page, 0, "right");
        const to = await getAnchorCanvasPosition(page, 1, "left");
        expect(from).toBeTruthy();
        expect(to).toBeTruthy();

        await whiteboard.selectTool("line");
        await dragCanvas(page, from!, to!);
        await page.waitForTimeout(300);

        expect(runtimeErrors).toEqual([]);
    });

    test("connects two rectangles with a snapped line", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(180, 250);
        await whiteboard.drawRectangleAt(520, 250);
        await whiteboard.expectObjects(2);

        const from = await getAnchorCanvasPosition(page, 0, "right");
        const to = await getAnchorCanvasPosition(page, 1, "left");
        expect(from).toBeTruthy();
        expect(to).toBeTruthy();

        await whiteboard.selectTool("line");
        await dragCanvas(page, from!, to!);

        await expect
            .poll(async () => {
                return page.evaluate(() => {
                    const connector = window.__WHITEBOARD_TEST__?.objects?.find(
                        (item) => item.fromAttachment?.objectId && item.toAttachment?.objectId
                    );
                    return connector?.type === "arrow";
                });
            })
            .toBe(true);
    });

    test("connects two shapes with a snapped arrow from select mode", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(160, 320);
        await whiteboard.drawRectangleAt(500, 320);
        await whiteboard.expectObjects(2);

        const from = await getAnchorCanvasPosition(page, 0, "right");
        const to = await getAnchorCanvasPosition(page, 1, "left");
        expect(from).toBeTruthy();
        expect(to).toBeTruthy();

        await whiteboard.selectTool("select");
        await dragCanvas(page, from!, to!);

        await expect
            .poll(async () => {
                return page.evaluate(() => {
                    const connector = window.__WHITEBOARD_TEST__?.objects?.find(
                        (item) => item.fromAttachment?.objectId && item.toAttachment?.objectId
                    );
                    return connector?.type === "arrow";
                });
            })
            .toBe(true);
    });

    test("updates connector endpoints when a connected shape moves", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(180, 250);
        await whiteboard.drawRectangleAt(520, 250);
        await whiteboard.expectObjects(2);

        const from = await getAnchorCanvasPosition(page, 0, "right");
        const to = await getAnchorCanvasPosition(page, 1, "left");
        await whiteboard.selectTool("line");
        await dragCanvas(page, from!, to!);

        const beforeMove = await page.evaluate(() => {
            const connector = window.__WHITEBOARD_TEST__?.objects?.find(
                (item) => item.fromAttachment?.objectId && item.toAttachment?.objectId
            );
            return connector ? { dx: connector.dx ?? 0, dy: connector.dy ?? 0 } : null;
        });
        expect(beforeMove).toBeTruthy();

        await whiteboard.selectTool("select");
        await dragCanvas(page, { x: 520, y: 250 }, { x: 620, y: 250 });

        await expect
            .poll(async () => {
                const afterMove = await page.evaluate(() => {
                    const connector = window.__WHITEBOARD_TEST__?.objects?.find(
                        (item) => item.fromAttachment?.objectId && item.toAttachment?.objectId
                    );
                    return connector ? { dx: connector.dx ?? 0, dy: connector.dy ?? 0 } : null;
                });

                if (!afterMove || !beforeMove) {
                    return false;
                }

                return Math.abs(afterMove.dx - beforeMove.dx) > 20;
            })
            .toBe(true);
    });

    test("does not keep an incomplete connector drag", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(180, 250);
        await whiteboard.drawRectangleAt(520, 250);
        await whiteboard.expectObjects(2);

        const from = await getAnchorCanvasPosition(page, 0, "right");
        expect(from).toBeTruthy();

        await whiteboard.selectTool("line");
        await dragCanvas(page, from!, { x: 360, y: 120 });

        await whiteboard.expectObjects(2);
    });

    test("auto-bends connectors when shapes are linked", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(180, 250);
        await whiteboard.drawRectangleAt(520, 250);
        await whiteboard.expectObjects(2);

        const from = await getAnchorCanvasPosition(page, 0, "right");
        const to = await getAnchorCanvasPosition(page, 1, "left");
        await whiteboard.selectTool("line");
        await dragCanvas(page, from!, to!);

        await expect
            .poll(async () => {
                const connector = await page.evaluate(() => {
                    const item = window.__WHITEBOARD_TEST__?.objects?.find(
                        (entry) => entry.fromAttachment?.objectId && entry.toAttachment?.objectId
                    );
                    return item ? Math.abs(item.curveBend ?? 0) : 0;
                });
                return connector;
            })
            .toBeGreaterThan(10);
    });

    test("allows multiple connectors between the same shape pair", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(180, 250);
        await whiteboard.drawRectangleAt(520, 250);
        await whiteboard.expectObjects(2);

        const rightAnchor = await getAnchorCanvasPosition(page, 0, "right");
        const leftAnchor = await getAnchorCanvasPosition(page, 1, "left");
        const topFrom = await getAnchorCanvasPosition(page, 0, "top");
        const topTo = await getAnchorCanvasPosition(page, 1, "top");
        expect(rightAnchor).toBeTruthy();
        expect(leftAnchor).toBeTruthy();
        expect(topFrom).toBeTruthy();
        expect(topTo).toBeTruthy();

        await whiteboard.selectTool("line");
        await dragCanvas(page, rightAnchor!, leftAnchor!);
        await whiteboard.expectObjects(3);

        await dragCanvas(page, topFrom!, topTo!);
        await whiteboard.expectObjects(4);

        await expect
            .poll(async () => {
                return page.evaluate(
                    () =>
                        window.__WHITEBOARD_TEST__?.objects?.filter(
                            (item) => item.fromAttachment?.objectId && item.toAttachment?.objectId
                        ).length ?? 0
                );
            })
            .toBe(2);
    });

    test("bends multiple connectors in opposite directions", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(180, 250);
        await whiteboard.drawRectangleAt(520, 250);

        const rightAnchor = await getAnchorCanvasPosition(page, 0, "right");
        const leftAnchor = await getAnchorCanvasPosition(page, 1, "left");
        const topFrom = await getAnchorCanvasPosition(page, 0, "top");
        const topTo = await getAnchorCanvasPosition(page, 1, "top");

        await whiteboard.selectTool("line");
        await dragCanvas(page, rightAnchor!, leftAnchor!);
        await dragCanvas(page, topFrom!, topTo!);

        await expect
            .poll(async () => {
                return page.evaluate(() => {
                    const bends = window.__WHITEBOARD_TEST__?.objects
                        ?.filter(
                            (item) => item.fromAttachment?.objectId && item.toAttachment?.objectId
                        )
                        .map((item) => item.curveBend ?? 0);

                    if (!bends || bends.length < 2) {
                        return false;
                    }

                    return bends[0] * bends[1] < 0;
                });
            })
            .toBe(true);
    });

    test("shows connect actions when a shape is selected", async ({ page, whiteboard }) => {
        await whiteboard.drawRectangleAt(300, 300);
        await whiteboard.selectTool("select");
        await page.getByTestId("canvas").click({ position: { x: 300, y: 300 } });

        await expect(page.getByTestId("connect-line")).toBeVisible();
        await expect(page.getByTestId("connect-arrow")).toBeVisible();
    });
});
