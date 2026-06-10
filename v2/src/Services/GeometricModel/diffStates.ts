import {
    IBoardObject,
    IBoardShapes,
    ICircleObject,
    ILineObject,
    IRectObject,
} from "../../Contracts/WhiteBoard";
import { boardObjectToDslToken } from "./boardToDsl";
import { ModelDslKind, ModelDslToken, parseModelDsl } from "./dslParser";
import { dslToBoard } from "./dslToBoard";

type RelativeDirection = "left" | "right" | "above" | "below" | "near";

interface RelativeInstruction {
    kind: ModelDslKind;
    direction: RelativeDirection;
    referenceKind?: ModelDslKind;
}

const roundForComparison = (value: number) => {
    return Math.round(value * 1000) / 1000;
};

const getBoardObjectKey = (boardObject: IBoardObject) => {
    const baseKey = [
        boardObject.type,
        roundForComparison(boardObject.x),
        roundForComparison(boardObject.y),
    ];

    switch (boardObject.type) {
        case IBoardShapes.RECT:
        case IBoardShapes.SQUARE:
        case IBoardShapes.TRIANGLE:
        case IBoardShapes.OVAL:
        case IBoardShapes.STAR: {
            const rectObject = boardObject as IRectObject;
            return [
                ...baseKey,
                roundForComparison(rectObject.width),
                roundForComparison(rectObject.height),
            ].join(":");
        }
        case IBoardShapes.CIRCLE: {
            const circleObject = boardObject as ICircleObject;
            return [...baseKey, roundForComparison(circleObject.radius)].join(":");
        }
        case IBoardShapes.LINE:
        case IBoardShapes.ARROW: {
            const lineObject = boardObject as ILineObject;
            return [
                ...baseKey,
                roundForComparison(lineObject.dx),
                roundForComparison(lineObject.dy),
            ].join(":");
        }
        default:
            return baseKey.join(":");
    }
};

const getCurrentDslTokenCount = (currentObjects: IBoardObject[]) => {
    return currentObjects.map(boardObjectToDslToken).filter(Boolean).length;
};

const shapeAliases: Record<string, ModelDslKind> = {
    circle: "cr",
    cr: "cr",
    rectangle: "rect",
    rect: "rect",
    square: "sq",
    sq: "sq",
    triangle: "tri",
    tri: "tri",
    line: "line",
};

const directionAliases: Record<string, RelativeDirection> = {
    left: "left",
    right: "right",
    above: "above",
    over: "above",
    top: "above",
    below: "below",
    blwo: "below",
    bewlo: "below",
    under: "below",
    beneath: "below",
    near: "near",
    nearby: "near",
    beside: "near",
    adjacent: "near",
};

const getBoardObjectDslKind = (boardObject: IBoardObject): ModelDslKind | null => {
    const token = boardObjectToDslToken(boardObject);
    return token ? parseModelDsl(token)[0]?.kind ?? null : null;
};

const getObjectSize = (boardObject: IBoardObject) => {
    switch (boardObject.type) {
        case IBoardShapes.CIRCLE:
            return Math.max((boardObject as ICircleObject).radius, 1);
        case IBoardShapes.LINE:
        case IBoardShapes.ARROW: {
            const lineObject = boardObject as ILineObject;
            return Math.max(Math.hypot(lineObject.dx, lineObject.dy), 1);
        }
        case IBoardShapes.RECT:
        case IBoardShapes.SQUARE:
        case IBoardShapes.TRIANGLE:
        case IBoardShapes.OVAL:
        case IBoardShapes.STAR: {
            const rectObject = boardObject as IRectObject;
            return Math.max(Math.abs(rectObject.width), Math.abs(rectObject.height), 1);
        }
        default:
            return 60;
    }
};

const getObjectBounds = (boardObject: IBoardObject) => {
    switch (boardObject.type) {
        case IBoardShapes.CIRCLE: {
            const circleObject = boardObject as ICircleObject;
            return {
                left: circleObject.x - circleObject.radius,
                right: circleObject.x + circleObject.radius,
                top: circleObject.y - circleObject.radius,
                bottom: circleObject.y + circleObject.radius,
            };
        }
        case IBoardShapes.LINE:
        case IBoardShapes.ARROW: {
            const lineObject = boardObject as ILineObject;
            return {
                left: Math.min(lineObject.x, lineObject.x + lineObject.dx),
                right: Math.max(lineObject.x, lineObject.x + lineObject.dx),
                top: Math.min(lineObject.y, lineObject.y + lineObject.dy),
                bottom: Math.max(lineObject.y, lineObject.y + lineObject.dy),
            };
        }
        default: {
            const rectObject = boardObject as IRectObject;
            return {
                left: Math.min(rectObject.x, rectObject.x + rectObject.width),
                right: Math.max(rectObject.x, rectObject.x + rectObject.width),
                top: Math.min(rectObject.y, rectObject.y + rectObject.height),
                bottom: Math.max(rectObject.y, rectObject.y + rectObject.height),
            };
        }
    }
};

const createRelativeToken = (
    kind: ModelDslKind,
    direction: RelativeDirection,
    referenceObject: IBoardObject
): ModelDslToken => {
    const bounds = getObjectBounds(referenceObject);
    const size = getObjectSize(referenceObject);
    const gap = Math.max(24, Math.round(size / 2));
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const isCircle = kind === "cr";

    const coordinatesByDirection: Record<RelativeDirection, { x: number; y: number }> = {
        left: {
            x: bounds.left - gap - size,
            y: centerY - (isCircle ? 0 : size / 2),
        },
        right: {
            x: bounds.right + gap + (isCircle ? size : 0),
            y: centerY - (isCircle ? 0 : size / 2),
        },
        above: {
            x: centerX - (isCircle ? 0 : size / 2),
            y: bounds.top - gap - size,
        },
        below: {
            x: centerX - (isCircle ? 0 : size / 2),
            y: bounds.bottom + gap + (isCircle ? size : 0),
        },
        near: {
            x: bounds.right + gap + (isCircle ? size : 0),
            y: bounds.bottom + gap + (isCircle ? size : 0),
        },
    };

    const coordinates = coordinatesByDirection[direction];
    return {
        kind,
        x: Math.round(coordinates.x),
        y: Math.round(coordinates.y),
        size: Math.round(size),
    };
};

const tokenizeRelativeText = (dslOutput: string) => {
    const words = dslOutput.toLowerCase().match(/[a-z]+/g) ?? [];

    return words.flatMap((word) => {
        if (word.startsWith("a") && shapeAliases[word.slice(1)]) {
            return ["a", word.slice(1)];
        }

        return [word];
    });
};

const findReferenceKind = (words: string[], directionIndex: number) => {
    for (let index = directionIndex + 1; index < Math.min(words.length, directionIndex + 8); index += 1) {
        const kind = shapeAliases[words[index]];
        if (kind) {
            return kind;
        }
    }

    return undefined;
};

const parseRelativeInstructions = (dslOutput: string): RelativeInstruction[] => {
    const words = tokenizeRelativeText(dslOutput);
    const instructions: RelativeInstruction[] = [];

    words.forEach((word, index) => {
        const kind = shapeAliases[word];
        if (!kind) {
            return;
        }

        for (let nextIndex = index + 1; nextIndex < Math.min(words.length, index + 10); nextIndex += 1) {
            const direction = directionAliases[words[nextIndex]];
            if (!direction) {
                continue;
            }

            instructions.push({
                kind,
                direction,
                referenceKind: findReferenceKind(words, nextIndex),
            });
            return;
        }
    });

    return instructions;
};

const findReferenceObject = (
    currentObjects: IBoardObject[],
    referenceKind?: ModelDslKind
) => {
    if (!referenceKind) {
        return currentObjects[currentObjects.length - 1];
    }

    for (let index = currentObjects.length - 1; index >= 0; index -= 1) {
        if (getBoardObjectDslKind(currentObjects[index]) === referenceKind) {
            return currentObjects[index];
        }
    }

    return currentObjects[currentObjects.length - 1];
};

const parseRelativeDslState = (
    currentObjects: IBoardObject[],
    generatedDsl: string
): IBoardObject[] => {
    const tokens = parseRelativeInstructions(generatedDsl).flatMap((instruction) => {
        const referenceObject = findReferenceObject(currentObjects, instruction.referenceKind);
        return referenceObject
            ? [createRelativeToken(instruction.kind, instruction.direction, referenceObject)]
            : [];
    });

    return dslToBoard(tokens);
};

export const diffStates = (
    currentObjects: IBoardObject[],
    generatedObjects: IBoardObject[]
): IBoardObject[] => {
    const seenObjects = new Set(currentObjects.map(getBoardObjectKey));

    return generatedObjects.filter((generatedObject) => {
        const objectKey = getBoardObjectKey(generatedObject);

        if (seenObjects.has(objectKey)) {
            return false;
        }

        seenObjects.add(objectKey);
        return true;
    });
};

export const diffGeneratedDslState = (
    currentObjects: IBoardObject[],
    generatedDsl: string,
    intentText = ""
): IBoardObject[] => {
    const generatedTokens = parseModelDsl(generatedDsl);
    const currentTokenCount = getCurrentDslTokenCount(currentObjects);
    const candidateTokens =
        generatedTokens.length > currentTokenCount
            ? generatedTokens.slice(currentTokenCount)
            : generatedTokens;
    const intentDelta = intentText
        ? diffStates(currentObjects, parseRelativeDslState(currentObjects, intentText))
        : [];
    const absoluteDelta = diffStates(currentObjects, dslToBoard(candidateTokens as ModelDslToken[]));

    return intentDelta.length
        ? intentDelta
        : absoluteDelta.length
        ? absoluteDelta
        : diffStates(currentObjects, parseRelativeDslState(currentObjects, generatedDsl));
};
