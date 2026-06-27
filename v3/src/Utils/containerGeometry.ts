import {
    IBoardObject,
    IBoardShapes,
    IContainerObject,
    IPlotPoint,
    IScribbleObject,
} from "../Contracts/WhiteBoard";
import { getShapeBounds, syncAttachedLines } from "./anchorGeometry";

export const isContainerObject = (boardObject: IBoardObject): boardObject is IContainerObject =>
    boardObject.type === IBoardShapes.CONTAINER;

const canBeContainerChild = (boardObject: IBoardObject) =>
    boardObject.type !== IBoardShapes.LINE &&
    boardObject.type !== IBoardShapes.ARROW &&
    boardObject.type !== IBoardShapes.SCRIBBLE;

export const getObjectCenter = (boardObject: IBoardObject): IPlotPoint => {
    const bounds = getShapeBounds(boardObject);
    return { x: bounds.centerX, y: bounds.centerY };
};

export const CONTAINER_DETACH_OVERLAP_RATIO = 0.35;
export const GENERATED_CONTAINER_PADDING = 24;

type ShapeBounds = ReturnType<typeof getShapeBounds>;

export const isPointInsideContainer = (container: IContainerObject, point: IPlotPoint) => {
    return (
        point.x >= container.x &&
        point.x <= container.x + container.width &&
        point.y >= container.y &&
        point.y <= container.y + container.height
    );
};

export const getBoundsOverlapArea = (a: ShapeBounds, b: ShapeBounds) => {
    const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return overlapWidth * overlapHeight;
};

export const getShapeContainerOverlapRatio = (
    child: IBoardObject,
    container: IContainerObject
) => {
    const childBounds = getShapeBounds(child);
    const containerBounds = getShapeBounds(container);
    const childArea =
        (childBounds.right - childBounds.left) * (childBounds.bottom - childBounds.top);
    if (childArea <= 0) {
        return 0;
    }

    return getBoundsOverlapArea(childBounds, containerBounds) / childArea;
};

export const shouldDetachFromContainer = (
    child: IBoardObject,
    container: IContainerObject,
    threshold = CONTAINER_DETACH_OVERLAP_RATIO
) => getShapeContainerOverlapRatio(child, container) < threshold;

export const shouldAttachToContainer = (
    child: IBoardObject,
    container: IContainerObject,
    threshold = CONTAINER_DETACH_OVERLAP_RATIO
) => {
    if (getShapeContainerOverlapRatio(child, container) >= threshold) {
        return true;
    }

    const center = getObjectCenter(child);
    return isPointInsideContainer(container, center);
};

export const findContainerAtPoint = (
    objects: IBoardObject[],
    point: IPlotPoint,
    excludeIds: string[] = []
) => {
    for (let index = objects.length - 1; index >= 0; index -= 1) {
        const boardObject = objects[index];
        if (
            !isContainerObject(boardObject) ||
            excludeIds.includes(boardObject.id) ||
            !isPointInsideContainer(boardObject, point)
        ) {
            continue;
        }

        return boardObject;
    }

    return null;
};

export const removeObjectFromContainers = (objects: IBoardObject[], objectId: string) => {
    objects.forEach((boardObject) => {
        if (!isContainerObject(boardObject)) {
            return;
        }

        boardObject.childIds = boardObject.childIds.filter((childId) => childId !== objectId);
    });

    const child = objects.find((item) => item.id === objectId);
    if (child) {
        delete child.parentId;
    }
};

export const addObjectToContainer = (
    objects: IBoardObject[],
    container: IContainerObject,
    childId: string
) => {
    if (container.id === childId || container.childIds.includes(childId)) {
        return;
    }

    removeObjectFromContainers(objects, childId);
    container.childIds.push(childId);

    const child = objects.find((item) => item.id === childId);
    if (child) {
        child.parentId = container.id;
    }
};

const translateObjectByDelta = (boardObject: IBoardObject, dx: number, dy: number) => {
    if (boardObject.type === IBoardShapes.SCRIBBLE) {
        const scribbleObject = boardObject as IScribbleObject;
        scribbleObject.x += dx;
        scribbleObject.y += dy;
        scribbleObject.path = scribbleObject.path.map((pathPoint) => ({
            x: pathPoint.x + dx,
            y: pathPoint.y + dy,
        }));
        return;
    }

    boardObject.x += dx;
    boardObject.y += dy;
};

export const translateContainerChildren = (
    objects: IBoardObject[],
    containerId: string,
    dx: number,
    dy: number
) => {
    if (!dx && !dy) {
        return;
    }

    const container = objects.find(
        (item): item is IContainerObject => item.id === containerId && isContainerObject(item)
    );
    if (!container) {
        return;
    }

    container.childIds.forEach((childId) => {
        const child = objects.find((item) => item.id === childId);
        if (!child) {
            return;
        }

        translateObjectByDelta(child, dx, dy);

        if (isContainerObject(child)) {
            translateContainerChildren(objects, child.id, dx, dy);
        }
    });

    syncAttachedLines(objects);
};

export const syncContainerMembership = (objects: IBoardObject[], boardObject: IBoardObject) => {
    if (!canBeContainerChild(boardObject)) {
        return;
    }

    if (boardObject.parentId) {
        const currentParent = objects.find(
            (item): item is IContainerObject =>
                item.id === boardObject.parentId && isContainerObject(item)
        );

        if (!currentParent || shouldDetachFromContainer(boardObject, currentParent)) {
            removeObjectFromContainers(objects, boardObject.id);
        } else {
            return;
        }
    }

    const center = getObjectCenter(boardObject);
    const nextContainer = findContainerAtPoint(objects, center, [boardObject.id]);
    if (nextContainer && shouldAttachToContainer(boardObject, nextContainer)) {
        addObjectToContainer(objects, nextContainer, boardObject.id);
        return;
    }

    for (let index = objects.length - 1; index >= 0; index -= 1) {
        const container = objects[index];
        if (
            !isContainerObject(container) ||
            container.id === boardObject.id ||
            !shouldAttachToContainer(boardObject, container)
        ) {
            continue;
        }

        addObjectToContainer(objects, container, boardObject.id);
        return;
    }
};

export const attachNewObjectToContainerAtPoint = (
    objects: IBoardObject[],
    boardObject: IBoardObject,
    point: IPlotPoint
) => {
    if (!canBeContainerChild(boardObject)) {
        return;
    }

    const container = findContainerAtPoint(objects, point, [boardObject.id]);
    if (container) {
        addObjectToContainer(objects, container, boardObject.id);
    }
};

export const wrapGeneratedShapesInContainer = (
    shapes: IBoardObject[],
    createContainerId: () => string
): IBoardObject[] => {
    const childableShapes = shapes.filter(canBeContainerChild);
    const nonChildableShapes = shapes.filter((shape) => !canBeContainerChild(shape));

    if (!childableShapes.length || childableShapes.length === 1) {
        return shapes;
    }

    const bounds = childableShapes.map((shape) => getShapeBounds(shape));
    const left = Math.min(...bounds.map((entry) => entry.left));
    const right = Math.max(...bounds.map((entry) => entry.right));
    const top = Math.min(...bounds.map((entry) => entry.top));
    const bottom = Math.max(...bounds.map((entry) => entry.bottom));
    const padding = GENERATED_CONTAINER_PADDING;

    const container: IContainerObject = {
        id: createContainerId(),
        type: IBoardShapes.CONTAINER,
        x: left - padding,
        y: top - padding,
        width: right - left + padding * 2,
        height: bottom - top + padding * 2,
        childIds: [],
    };

    const wrappedObjects = [container, ...childableShapes, ...nonChildableShapes];
    childableShapes.forEach((child) => {
        addObjectToContainer(wrappedObjects, container, child.id);
    });

    return wrappedObjects;
};

export const collectContainerDescendantIds = (
    objects: IBoardObject[],
    containerId: string
): string[] => {
    const container = objects.find(
        (item): item is IContainerObject => item.id === containerId && isContainerObject(item)
    );
    if (!container) {
        return [];
    }

    return container.childIds.flatMap((childId) => {
        const child = objects.find((item) => item.id === childId);
        if (child && isContainerObject(child)) {
            return [childId, ...collectContainerDescendantIds(objects, childId)];
        }
        return [childId];
    });
};

export const deleteContainerChildren = (objects: IBoardObject[], containerId: string) => {
    const descendantIds = collectContainerDescendantIds(objects, containerId);
    descendantIds.forEach((childId) => removeObjectFromContainers(objects, childId));
    return descendantIds;
};
