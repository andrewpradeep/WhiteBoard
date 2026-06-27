import { IBoardObject, IBoardShapes, IRectObject } from "../../../Contracts/WhiteBoard";

const createGeneratedId = (index: number) =>
    `generated-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${index}`}`;

const parseCount = (command: string, fallback = 3) => {
    const match = command.match(/\b(\d+)\b/);
    return match ? Number(match[1]) : fallback;
};

export const matchPattern = (command: string): string | null => {
    const normalized = command.toLowerCase();

    if (/\b(house|home|roof)\b/.test(normalized)) {
        return "house";
    }
    if (/\b(smiley|face)\b/.test(normalized)) {
        return "smiley";
    }
    if (/\bgrid\b/.test(normalized)) {
        return "grid";
    }
    if (/\b(row|line of)\b/.test(normalized)) {
        return "row";
    }

    return null;
};

export const expandPattern = (patternId: string, command: string): IBoardObject[] => {
    const originX = 240;
    const originY = 240;

    switch (patternId) {
        case "house":
            return [
                {
                    id: createGeneratedId(0),
                    type: IBoardShapes.RECT,
                    x: originX,
                    y: originY + 80,
                    width: 120,
                    height: 90,
                },
                {
                    id: createGeneratedId(1),
                    type: IBoardShapes.TRIANGLE,
                    x: originX,
                    y: originY,
                    width: 120,
                    height: 80,
                },
            ];
        case "smiley":
            return [
                {
                    id: createGeneratedId(0),
                    type: IBoardShapes.CIRCLE,
                    x: originX + 60,
                    y: originY + 60,
                    radius: 60,
                },
                {
                    id: createGeneratedId(1),
                    type: IBoardShapes.CIRCLE,
                    x: originX + 40,
                    y: originY + 45,
                    radius: 8,
                },
                {
                    id: createGeneratedId(2),
                    type: IBoardShapes.CIRCLE,
                    x: originX + 80,
                    y: originY + 45,
                    radius: 8,
                },
            ];
        case "grid": {
            const count = parseCount(command, 3);
            const gap = 70;
            const objects: IBoardObject[] = [];
            for (let row = 0; row < count; row += 1) {
                for (let col = 0; col < count; col += 1) {
                    objects.push({
                        id: createGeneratedId(objects.length),
                        type: IBoardShapes.CIRCLE,
                        x: originX + col * gap,
                        y: originY + row * gap,
                        radius: 20,
                    });
                }
            }
            return objects;
        }
        case "row": {
            const count = parseCount(command, 5);
            const gap = 70;
            return Array.from({ length: count }, (_, index) => ({
                id: createGeneratedId(index),
                type: IBoardShapes.RECT,
                x: originX + index * gap,
                y: originY,
                width: 50,
                height: 50,
            })) as IRectObject[];
        }
        default:
            return [];
    }
};
