import { IBoardObject, IBoardShapes } from "../Contracts/WhiteBoard";

const DISPLAY_NAME_PREFIX: Record<IBoardShapes, string> = {
    [IBoardShapes.RECT]: "rect",
    [IBoardShapes.SQUARE]: "square",
    [IBoardShapes.CIRCLE]: "circle",
    [IBoardShapes.TRIANGLE]: "triangle",
    [IBoardShapes.LINE]: "line",
    [IBoardShapes.ARROW]: "arrow",
    [IBoardShapes.CONTAINER]: "container",
    [IBoardShapes.TEXT_BOX]: "textbox",
    [IBoardShapes.STAR]: "star",
    [IBoardShapes.OVAL]: "oval",
    [IBoardShapes.SCRIBBLE]: "scribble",
};

export const getDisplayNamePrefix = (type: IBoardShapes) => DISPLAY_NAME_PREFIX[type];

const getUsedNumbers = (objects: IBoardObject[], prefix: string) => {
    const pattern = new RegExp(`^${prefix}(\\d+)$`, "i");

    return objects
        .map((object) => object.displayName?.match(pattern)?.[1])
        .filter(Boolean)
        .map((value) => Number(value));
};

export const createDisplayName = (objects: IBoardObject[], type: IBoardShapes) => {
    const prefix = getDisplayNamePrefix(type);
    const usedNumbers = getUsedNumbers(objects, prefix);
    const nextNumber = usedNumbers.length ? Math.max(...usedNumbers) + 1 : 1;

    return `${prefix}${nextNumber}`;
};

export const assignDisplayName = (objects: IBoardObject[], object: IBoardObject) => {
    if (object.displayName) {
        return object.displayName;
    }

    object.displayName = createDisplayName(objects, object.type);
    return object.displayName;
};

export const assignDisplayNames = (objects: IBoardObject[], newObjects: IBoardObject[]) => {
    const assignedObjects = [...objects];

    newObjects.forEach((object) => {
        assignDisplayName(assignedObjects, object);
        assignedObjects.push(object);
    });
};

export const ensureBoardDisplayNames = (objectList: IBoardObject[]) => {
    objectList.forEach((object, index) => {
        if (!object.displayName) {
            assignDisplayName(objectList.slice(0, index), object);
        }
    });
};

export const getShapeTypeLabel = (type: IBoardShapes) => {
    switch (type) {
        case IBoardShapes.RECT:
            return "rectangle";
        case IBoardShapes.SQUARE:
            return "square";
        case IBoardShapes.CIRCLE:
            return "circle";
        case IBoardShapes.TRIANGLE:
            return "triangle";
        case IBoardShapes.LINE:
            return "line";
        case IBoardShapes.ARROW:
            return "arrow";
        case IBoardShapes.CONTAINER:
            return "container";
        case IBoardShapes.TEXT_BOX:
            return "text box";
        case IBoardShapes.STAR:
            return "star";
        case IBoardShapes.OVAL:
            return "oval";
        case IBoardShapes.SCRIBBLE:
            return "scribble";
        default:
            return type;
    }
};
