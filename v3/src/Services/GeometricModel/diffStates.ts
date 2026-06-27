import {
    IBoardObject,
    IBoardShapes,
    ICircleObject,
    ILineObject,
    IRectObject,
    IViewport,
} from "../../Contracts/WhiteBoard";
import { isShapeVisibleInViewport, CanvasPixelSize } from "../../Utils/viewportGeometry";
import { boardObjectToDslToken } from "./boardToDsl";
import { ModelDslKind, ModelDslToken, parseModelDsl } from "./dslParser";
import { dslToBoard } from "./dslToBoard";
import { resolveShapeAlias } from "./shapeAliases";

type RelativeDirection = "left" | "right" | "above" | "below" | "near";

export interface ReferenceContext {
    viewport?: IViewport;
    canvasPixelSize?: CanvasPixelSize;
}

export interface RelativeInstruction {
    kind: ModelDslKind;
    direction: RelativeDirection;
    referenceKind?: ModelDslKind;
    referenceName?: string;
    offsetPx?: number;
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
    bottom: "below",
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
    referenceObject: IBoardObject,
    offsetPx?: number
): ModelDslToken => {
    const bounds = getObjectBounds(referenceObject);
    const size = getObjectSize(referenceObject);
    const gap = offsetPx ?? Math.max(24, Math.round(size / 2));
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
    const normalized = dslOutput.toLowerCase();
    const rawTokens = normalized.match(/[a-z]+\d*|\d+px/g) ?? [];

    return rawTokens.flatMap((token) => {
        if (token.startsWith("a") && token.length > 1 && resolveShapeAlias(token.slice(1))) {
            return ["a", token.slice(1)];
        }

        return [token];
    });
};

const isReferenceNameToken = (word: string) => /^[a-z]+\d+$/.test(word);

const isShapeKindToken = (word: string) =>
    !isReferenceNameToken(word) && resolveShapeAlias(word) !== null;

const findOffsetPx = (words: string[], directionIndex: number) => {
    for (let index = directionIndex - 1; index >= Math.max(0, directionIndex - 4); index -= 1) {
        const match = words[index].match(/^(\d+)px$/);
        if (match) {
            return Number(match[1]);
        }
    }

    return undefined;
};

const findTargetKind = (words: string[], directionIndex: number) => {
    for (let index = directionIndex - 1; index >= Math.max(0, directionIndex - 8); index -= 1) {
        if (words[index].endsWith("px")) {
            continue;
        }

        if (isShapeKindToken(words[index])) {
            return resolveShapeAlias(words[index]);
        }
    }

    return null;
};

const findReferenceTarget = (words: string[], directionIndex: number) => {
    for (let index = directionIndex + 1; index < Math.min(words.length, directionIndex + 8); index += 1) {
        if (words[index] === "of" || words[index] === "the") {
            continue;
        }

        if (isReferenceNameToken(words[index])) {
            return { referenceName: words[index] };
        }

        if (isShapeKindToken(words[index])) {
            return { referenceKind: resolveShapeAlias(words[index]) ?? undefined };
        }
    }

    return {};
};

export const parseRelativeInstructions = (dslOutput: string): RelativeInstruction[] => {
    const words = tokenizeRelativeText(dslOutput);
    const instructions: RelativeInstruction[] = [];

    words.forEach((word, index) => {
        const direction = directionAliases[word];
        if (!direction) {
            return;
        }

        const kind = findTargetKind(words, index);
        if (!kind) {
            return;
        }

        instructions.push({
            kind,
            direction,
            offsetPx: findOffsetPx(words, index),
            ...findReferenceTarget(words, index),
        });
    });

    return instructions;
};

const findLastMatchingKind = (
    currentObjects: IBoardObject[],
    referenceKind: ModelDslKind,
    predicate?: (boardObject: IBoardObject) => boolean
) => {
    for (let index = currentObjects.length - 1; index >= 0; index -= 1) {
        const boardObject = currentObjects[index];
        if (
            getBoardObjectDslKind(boardObject) === referenceKind &&
            (!predicate || predicate(boardObject))
        ) {
            return boardObject;
        }
    }

    return null;
};

export const findReferenceObject = (
    currentObjects: IBoardObject[],
    referenceName?: string,
    referenceKind?: ModelDslKind,
    context?: ReferenceContext
) => {
    if (referenceName) {
        const normalizedReferenceName = referenceName.toLowerCase();
        const namedReference = currentObjects.find(
            (object) => object.displayName?.toLowerCase() === normalizedReferenceName
        );
        if (namedReference) {
            return namedReference;
        }
    }

    if (referenceKind) {
        const isVisible = (boardObject: IBoardObject) => {
            if (!context?.viewport || !context.canvasPixelSize) {
                return true;
            }

            return isShapeVisibleInViewport(
                boardObject,
                context.viewport,
                context.canvasPixelSize
            );
        };

        const visibleMatch = findLastMatchingKind(currentObjects, referenceKind, isVisible);
        if (visibleMatch) {
            return visibleMatch;
        }

        const boardMatch = findLastMatchingKind(currentObjects, referenceKind);
        if (boardMatch) {
            return boardMatch;
        }
    }

    return currentObjects[currentObjects.length - 1];
};

export const parseRelativeDslState = (
    currentObjects: IBoardObject[],
    generatedDsl: string,
    context?: ReferenceContext
): IBoardObject[] => {
    const tokens = parseRelativeInstructions(generatedDsl).flatMap((instruction) => {
        const referenceObject = findReferenceObject(
            currentObjects,
            instruction.referenceName,
            instruction.referenceKind,
            context
        );
        return referenceObject
            ? [
                  createRelativeToken(
                      instruction.kind,
                      instruction.direction,
                      referenceObject,
                      instruction.offsetPx
                  ),
              ]
            : [];
    });

    return dslToBoard(tokens, currentObjects);
};

const simpleShapeVerbs = /\b(add|create|draw|make|place)\b/;
const simpleShapeStopWords = new Set([
    "add",
    "create",
    "draw",
    "make",
    "place",
    "a",
    "an",
    "the",
    "on",
    "to",
    "board",
    "my",
    "new",
    "one",
    "please",
    "shape",
    "shapes",
]);

export const parseSimpleShapeCommand = (command: string): ModelDslKind | null => {
    const normalized = command.toLowerCase().trim();
    if (!simpleShapeVerbs.test(normalized) || parseRelativeInstructions(command).length > 0) {
        return null;
    }

    const words = normalized.match(/[a-z]+/g) ?? [];
    for (const word of words) {
        if (simpleShapeStopWords.has(word)) {
            continue;
        }

        const kind = resolveShapeAlias(word);
        if (kind) {
            return kind;
        }
    }

    return null;
};

export const createSimpleShapeFromCommand = (
    command: string,
    existingObjects: IBoardObject[]
): IBoardObject[] => {
    const kind = parseSimpleShapeCommand(command);
    if (!kind) {
        return [];
    }

    const token: ModelDslToken = {
        kind,
        x: 240,
        y: 240,
        size: kind === "rect" ? 80 : 60,
    };

    return dslToBoard([token], existingObjects);
};

export const hasNamedOrPixelRelativeIntent = (command: string) =>
    parseRelativeInstructions(command).some(
        (instruction) => instruction.referenceName || instruction.offsetPx !== undefined
    );

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
    intentText = "",
    context?: ReferenceContext
): IBoardObject[] => {
    const generatedTokens = parseModelDsl(generatedDsl);
    const currentTokenCount = getCurrentDslTokenCount(currentObjects);
    const candidateTokens =
        generatedTokens.length > currentTokenCount
            ? generatedTokens.slice(currentTokenCount)
            : generatedTokens;
    const intentDelta = intentText
        ? diffStates(currentObjects, parseRelativeDslState(currentObjects, intentText, context))
        : [];
    const absoluteDelta = diffStates(
        currentObjects,
        dslToBoard(candidateTokens as ModelDslToken[], currentObjects)
    );

    return intentDelta.length
        ? intentDelta
        : absoluteDelta.length
          ? absoluteDelta
          : diffStates(currentObjects, parseRelativeDslState(currentObjects, generatedDsl, context));
};
