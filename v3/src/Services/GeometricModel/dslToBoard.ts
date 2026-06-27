import { IBoardObject, IBoardShapes } from "../../Contracts/WhiteBoard";
import { assignDisplayNames } from "../../Utils/objectNaming";
import { ModelDslToken, parseModelDsl } from "./dslParser";

const createGeneratedId = (index: number) => {
    return `generated-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${index}`}`;
};

const tokenToBoardObject = (token: ModelDslToken, index: number): IBoardObject => {
    const baseObject = {
        id: createGeneratedId(index),
        x: token.x,
        y: token.y,
    };

    switch (token.kind) {
        case "cr":
            return {
                ...baseObject,
                type: IBoardShapes.CIRCLE,
                radius: token.size,
            };
        case "tri":
            return {
                ...baseObject,
                type: IBoardShapes.TRIANGLE,
                width: token.size,
                height: token.size,
            };
        case "line":
            return {
                ...baseObject,
                type: IBoardShapes.LINE,
                dx: token.size,
                dy: 0,
            };
        case "sq":
        case "rect":
            return {
                ...baseObject,
                type: IBoardShapes.RECT,
                width: token.size,
                height: token.size,
            };
    }
};

export const dslToBoard = (
    dslOutput: string | ModelDslToken[],
    existingObjects: IBoardObject[] = []
) => {
    const tokens = typeof dslOutput === "string" ? parseModelDsl(dslOutput) : dslOutput;
    const generatedObjects = tokens.map(tokenToBoardObject);
    assignDisplayNames(existingObjects, generatedObjects);
    return generatedObjects;
};
