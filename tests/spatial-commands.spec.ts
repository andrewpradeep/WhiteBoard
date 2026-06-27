import { expect, test } from "@playwright/test";
import { IBoardShapes } from "../v3/src/Contracts/WhiteBoard";
import {
    createSimpleShapeFromCommand,
    findReferenceObject,
    parseRelativeDslState,
    parseRelativeInstructions,
    parseSimpleShapeCommand,
    ReferenceContext,
} from "../v3/src/Services/GeometricModel/diffStates";

const createRect = (id: string, x: number, y: number, displayName: string) => ({
    id,
    type: IBoardShapes.RECT,
    x,
    y,
    width: 80,
    height: 60,
    displayName,
});

const defaultViewport = { offsetX: 0, offsetY: 0, scale: 1 };
const defaultCanvasSize = { width: 800, height: 600 };
const viewportContext: ReferenceContext = {
    viewport: defaultViewport,
    canvasPixelSize: defaultCanvasSize,
};

test.describe("spatial commands", () => {
    test("parses named pixel offset instructions", () => {
        const instructions = parseRelativeInstructions("add a square 20px left of rect2");

        expect(instructions).toHaveLength(1);
        expect(instructions[0]).toMatchObject({
            kind: "sq",
            direction: "left",
            referenceName: "rect2",
            offsetPx: 20,
        });
    });

    test("supports top and bottom direction aliases", () => {
        expect(parseRelativeInstructions("add rect top of rect1")[0]?.direction).toBe("above");
        expect(parseRelativeInstructions("add rect bottom of rect1")[0]?.direction).toBe("below");
    });

    test("resolves references by display name", () => {
        const objects = [createRect("rect-1", 100, 100, "rect1"), createRect("rect-2", 300, 100, "rect2")];

        expect(findReferenceObject(objects, "rect2")?.id).toBe("rect-2");
    });

    test("places a square 20px left of a named rect", () => {
        const objects = [createRect("rect-2", 200, 120, "rect2")];
        const generated = parseRelativeDslState(objects, "add a square 20px left of rect2");

        expect(generated).toHaveLength(1);
        expect(generated[0].type).toBe(IBoardShapes.RECT);
        expect(generated[0].x).toBe(100);
        expect(generated[0].y).toBe(110);
        expect(generated[0].displayName).toBe("rect3");
    });

    test("places a circle to the right of a named rect", () => {
        const objects = [createRect("rect-1", 100, 100, "rect1")];
        const generated = parseRelativeDslState(objects, "add circle right of rect1");

        expect(generated).toHaveLength(1);
        expect(generated[0].type).toBe(IBoardShapes.CIRCLE);
        expect(generated[0].x).toBeGreaterThan(160);
    });

    test("prefers the last visible type match in the viewport", () => {
        const objects = [
            createRect("rect-1", 100, 100, "rect1"),
            createRect("rect-2", 300, 100, "rect2"),
            createRect("rect-off", -500, 100, "rectOff"),
        ];

        expect(findReferenceObject(objects, undefined, "rect", viewportContext)?.id).toBe("rect-2");
    });

    test("falls back to the last board match when no type match is visible", () => {
        const objects = [createRect("rect-1", -500, 100, "rect1"), createRect("rect-2", -400, 100, "rect2")];

        expect(findReferenceObject(objects, undefined, "rect", viewportContext)?.id).toBe("rect-2");
    });

    test("uses viewport-aware type reference for relative placement", () => {
        const objects = [
            createRect("rect-off", -500, 120, "rectOff"),
            createRect("rect-visible", 200, 120, "rectVisible"),
        ];
        const generated = parseRelativeDslState(
            objects,
            "add a circle to the right of the rectangle",
            viewportContext
        );

        expect(generated).toHaveLength(1);
        expect(generated[0].type).toBe(IBoardShapes.CIRCLE);
        expect(generated[0].x).toBeGreaterThan(260);
    });

    test("parses simple create commands without relative placement", () => {
        expect(parseSimpleShapeCommand("draw a rectangle")).toBe("rect");
        expect(parseSimpleShapeCommand("create a circle")).toBe("cr");
        expect(parseSimpleShapeCommand("add a circle right of rect1")).toBeNull();
    });

    test("matches misspelled shape names with fuzzy logic", () => {
        expect(parseSimpleShapeCommand("draw a curcle")).toBe("cr");
        expect(parseSimpleShapeCommand("create a sqare")).toBe("sq");
        expect(parseSimpleShapeCommand("draw a triangel")).toBe("tri");
        expect(parseSimpleShapeCommand("draw a rectanlge")).toBe("rect");
    });

    test("creates a rectangle from a simple draw command", () => {
        const generated = createSimpleShapeFromCommand("draw a rectangle", []);

        expect(generated).toHaveLength(1);
        expect(generated[0].type).toBe(IBoardShapes.RECT);
        expect(generated[0].displayName).toBe("rect1");
    });
});
