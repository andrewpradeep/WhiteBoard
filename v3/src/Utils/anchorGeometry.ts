import {
    AnchorSide,
    IBoardObject,
    IBoardShapes,
    ICircleObject,
    ILineAttachment,
    ILineObject,
    IPlotPoint,
    IRectObject,
    IScribbleObject,
} from "../Contracts/WhiteBoard";

export interface ShapeAnchor {
    side: AnchorSide;
    x: number;
    y: number;
}

export interface AnchorHit {
    objectId: string;
    side: AnchorSide;
    x: number;
    y: number;
}

export const isConnectableShape = (boardObject: IBoardObject) =>
    boardObject.type !== IBoardShapes.LINE &&
    boardObject.type !== IBoardShapes.ARROW &&
    boardObject.type !== IBoardShapes.SCRIBBLE &&
    boardObject.type !== IBoardShapes.CONTAINER;

export const getShapeBounds = (boardObject: IBoardObject) => {
    switch (boardObject.type) {
        case IBoardShapes.CIRCLE: {
            const circle = boardObject as ICircleObject;
            return {
                left: circle.x - circle.radius,
                right: circle.x + circle.radius,
                top: circle.y - circle.radius,
                bottom: circle.y + circle.radius,
                centerX: circle.x,
                centerY: circle.y,
            };
        }
        case IBoardShapes.LINE:
        case IBoardShapes.ARROW: {
            const line = boardObject as ILineObject;
            const endX = line.x + line.dx;
            const endY = line.y + line.dy;
            return {
                left: Math.min(line.x, endX),
                right: Math.max(line.x, endX),
                top: Math.min(line.y, endY),
                bottom: Math.max(line.y, endY),
                centerX: (line.x + endX) / 2,
                centerY: (line.y + endY) / 2,
            };
        }
        case IBoardShapes.SCRIBBLE: {
            const scribble = boardObject as IScribbleObject;
            const points = [{ x: scribble.x, y: scribble.y }, ...scribble.path];
            const xs = points.map((point) => point.x);
            const ys = points.map((point) => point.y);
            const left = Math.min(...xs);
            const right = Math.max(...xs);
            const top = Math.min(...ys);
            const bottom = Math.max(...ys);
            return {
                left,
                right,
                top,
                bottom,
                centerX: (left + right) / 2,
                centerY: (top + bottom) / 2,
            };
        }
        default: {
            const rect = boardObject as IRectObject;
            return {
                left: rect.x,
                right: rect.x + rect.width,
                top: rect.y,
                bottom: rect.y + rect.height,
                centerX: rect.x + rect.width / 2,
                centerY: rect.y + rect.height / 2,
            };
        }
    }
};

export const getAnchorPosition = (boardObject: IBoardObject, side: AnchorSide): IPlotPoint => {
    const bounds = getShapeBounds(boardObject);

    switch (side) {
        case "top":
            return { x: bounds.centerX, y: bounds.top };
        case "bottom":
            return { x: bounds.centerX, y: bounds.bottom };
        case "left":
            return { x: bounds.left, y: bounds.centerY };
        case "right":
            return { x: bounds.right, y: bounds.centerY };
        case "center":
        default:
            return { x: bounds.centerX, y: bounds.centerY };
    }
};

export const getShapeAnchors = (boardObject: IBoardObject): ShapeAnchor[] => {
    if (!isConnectableShape(boardObject)) {
        return [];
    }

    return (["top", "right", "bottom", "left"] as AnchorSide[]).map((side) => {
        const position = getAnchorPosition(boardObject, side);
        return { side, x: position.x, y: position.y };
    });
};

export const findNearestAnchor = (
    objects: IBoardObject[],
    point: IPlotPoint,
    hitRadius: number,
    excludeObjectIds: string[] = []
): AnchorHit | null => {
    let nearest: (AnchorHit & { distance: number }) | null = null;

    objects.forEach((boardObject) => {
        if (!isConnectableShape(boardObject) || excludeObjectIds.includes(boardObject.id)) {
            return;
        }

        getShapeAnchors(boardObject).forEach((anchor) => {
            const distance = Math.hypot(point.x - anchor.x, point.y - anchor.y);
            if (distance > hitRadius) {
                return;
            }

            if (!nearest || distance < nearest.distance) {
                nearest = {
                    objectId: boardObject.id,
                    side: anchor.side,
                    x: anchor.x,
                    y: anchor.y,
                    distance,
                };
            }
        });
    });

    if (!nearest) {
        return null;
    }

    const { objectId, side, x, y } = nearest;
    return { objectId, side, x, y };
};

export const resolveLineAttachments = (
    lineObject: ILineObject,
    objects: IBoardObject[]
): Pick<ILineObject, "x" | "y" | "dx" | "dy"> => {
    let start = { x: lineObject.x, y: lineObject.y };
    let end = {
        x: lineObject.x + lineObject.dx,
        y: lineObject.y + lineObject.dy,
    };

    if (lineObject.fromAttachment) {
        const source = objects.find((item) => item.id === lineObject.fromAttachment?.objectId);
        if (source && isConnectableShape(source)) {
            start = getAnchorPosition(source, lineObject.fromAttachment.side);
        }
    }

    if (lineObject.toAttachment) {
        const target = objects.find((item) => item.id === lineObject.toAttachment?.objectId);
        if (target && isConnectableShape(target)) {
            end = getAnchorPosition(target, lineObject.toAttachment.side);
        }
    }

    return {
        x: start.x,
        y: start.y,
        dx: end.x - start.x,
        dy: end.y - start.y,
    };
};

export const applyAttachmentsToLine = (lineObject: ILineObject, objects: IBoardObject[]) => {
    if (lineObject.fromAttachment) {
        const source = objects.find((item) => item.id === lineObject.fromAttachment?.objectId);
        if (!source || !isConnectableShape(source)) {
            lineObject.fromAttachment = undefined;
        }
    }

    if (lineObject.toAttachment) {
        const target = objects.find((item) => item.id === lineObject.toAttachment?.objectId);
        if (!target || !isConnectableShape(target)) {
            lineObject.toAttachment = undefined;
        }
    }

    const resolved = resolveLineAttachments(lineObject, objects);
    lineObject.x = resolved.x;
    lineObject.y = resolved.y;
    lineObject.dx = resolved.dx;
    lineObject.dy = resolved.dy;
};

export const syncAttachedLines = (objects: IBoardObject[]) => {
    objects.forEach((boardObject) => {
        if (boardObject.type === IBoardShapes.LINE || boardObject.type === IBoardShapes.ARROW) {
            applyAttachmentsToLine(boardObject as ILineObject, objects);
        }
    });
};

export const detachLinesFromObject = (objects: IBoardObject[], objectId: string) => {
    objects.forEach((boardObject) => {
        if (boardObject.type !== IBoardShapes.LINE && boardObject.type !== IBoardShapes.ARROW) {
            return;
        }

        const lineObject = boardObject as ILineObject;
        if (lineObject.fromAttachment?.objectId === objectId) {
            lineObject.fromAttachment = undefined;
        }
        if (lineObject.toAttachment?.objectId === objectId) {
            lineObject.toAttachment = undefined;
        }
    });
};

export const toLineAttachment = (hit: AnchorHit): ILineAttachment => ({
    objectId: hit.objectId,
    side: hit.side,
});

export const isCompleteConnector = (lineObject: ILineObject) =>
    Boolean(
        lineObject.fromAttachment &&
            lineObject.toAttachment &&
            lineObject.fromAttachment.objectId !== lineObject.toAttachment.objectId
    );

export const findConnectorBetween = (
    objects: IBoardObject[],
    objectIdA: string,
    objectIdB: string,
    excludeLineId?: string
): ILineObject | undefined => {
    const match = objects.find((boardObject) => {
        if (boardObject.id === excludeLineId) {
            return false;
        }

        if (boardObject.type !== IBoardShapes.LINE && boardObject.type !== IBoardShapes.ARROW) {
            return false;
        }

        const lineObject = boardObject as ILineObject;
        if (!lineObject.fromAttachment || !lineObject.toAttachment) {
            return false;
        }

        const fromId = lineObject.fromAttachment.objectId;
        const toId = lineObject.toAttachment.objectId;

        return (
            (fromId === objectIdA && toId === objectIdB) ||
            (fromId === objectIdB && toId === objectIdA)
        );
    });

    return match as ILineObject | undefined;
};
