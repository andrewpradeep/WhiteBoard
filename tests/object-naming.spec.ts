import { expect, test } from "@playwright/test";
import { IBoardShapes } from "../v3/src/Contracts/WhiteBoard";
import {
    assignDisplayName,
    assignDisplayNames,
    createDisplayName,
    ensureBoardDisplayNames,
} from "../v3/src/Utils/objectNaming";

test.describe("object naming", () => {
    test("assigns rect and circle names without collisions", () => {
        const objects = [
            {
                id: "rect-1",
                type: IBoardShapes.RECT,
                x: 40,
                y: 40,
                width: 60,
                height: 60,
            },
            {
                id: "rect-2",
                type: IBoardShapes.RECT,
                x: 140,
                y: 40,
                width: 60,
                height: 60,
            },
            {
                id: "circle-1",
                type: IBoardShapes.CIRCLE,
                x: 240,
                y: 40,
                radius: 30,
            },
        ];

        assignDisplayNames([], objects);

        expect(objects[0].displayName).toBe("rect1");
        expect(objects[1].displayName).toBe("rect2");
        expect(objects[2].displayName).toBe("circle1");
    });

    test("creates the next available display name", () => {
        const objects = [
            {
                id: "rect-1",
                type: IBoardShapes.RECT,
                x: 0,
                y: 0,
                width: 40,
                height: 40,
                displayName: "rect1",
            },
            {
                id: "rect-3",
                type: IBoardShapes.RECT,
                x: 80,
                y: 0,
                width: 40,
                height: 40,
                displayName: "rect3",
            },
        ];

        expect(createDisplayName(objects, IBoardShapes.RECT)).toBe("rect4");
    });

    test("backfills missing display names", () => {
        const objects = [
            {
                id: "rect-1",
                type: IBoardShapes.RECT,
                x: 0,
                y: 0,
                width: 40,
                height: 40,
            },
            {
                id: "circle-1",
                type: IBoardShapes.CIRCLE,
                x: 80,
                y: 0,
                radius: 20,
                displayName: "circle1",
            },
        ];

        ensureBoardDisplayNames(objects);

        expect(objects[0].displayName).toBe("rect1");
        expect(objects[1].displayName).toBe("circle1");
    });

    test("does not overwrite an existing display name", () => {
        const object = {
            id: "rect-1",
            type: IBoardShapes.RECT,
            x: 0,
            y: 0,
            width: 40,
            height: 40,
            displayName: "rect9",
        };

        assignDisplayName([], object);
        expect(object.displayName).toBe("rect9");
    });
});
