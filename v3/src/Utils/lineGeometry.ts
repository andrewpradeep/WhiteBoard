import { IBoardObject, IBoardShapes, ILineObject, IPlotPoint } from "../Contracts/WhiteBoard";
import { getAnchorPosition } from "./anchorGeometry";

export interface LineGeometry {
    start: IPlotPoint;
    end: IPlotPoint;
    control: IPlotPoint;
    mid: IPlotPoint;
    perp: IPlotPoint;
    length: number;
    curveMidpoint: IPlotPoint;
}

export const isCurvedLine = (lineObject: ILineObject) =>
    Math.abs(lineObject.curveBend ?? 0) > 0.5;

export const getLineGeometry = (lineObject: ILineObject): LineGeometry => {
    const start = { x: lineObject.x, y: lineObject.y };
    const end = { x: lineObject.x + lineObject.dx, y: lineObject.y + lineObject.dy };
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const chordX = end.x - start.x;
    const chordY = end.y - start.y;
    const length = Math.hypot(chordX, chordY) || 1;
    const perp = { x: -chordY / length, y: chordX / length };
    const bend = lineObject.curveBend ?? 0;
    const control = {
        x: mid.x + perp.x * bend,
        y: mid.y + perp.y * bend,
    };
    const curveMidpoint = getQuadraticPoint(start, control, end, 0.5);

    return { start, end, control, mid, perp, length, curveMidpoint };
};

export const getQuadraticPoint = (
    start: IPlotPoint,
    control: IPlotPoint,
    end: IPlotPoint,
    t: number
): IPlotPoint => {
    const inverse = 1 - t;
    return {
        x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
        y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
    };
};

export const getArrowEndAngle = (lineObject: ILineObject) => {
    const { control, end } = getLineGeometry(lineObject);
    return Math.atan2(end.y - control.y, end.x - control.x);
};

export const getHandleHitRadius = (point: {
    pixelRatio?: number;
    viewportScale?: number;
}) => {
    const pixelRatio = point.pixelRatio ?? window.devicePixelRatio ?? 1;
    const viewportScale = point.viewportScale ?? 1;
    return (14 * pixelRatio) / viewportScale;
};

export const getPointToQuadraticBezierDistance = (
    point: IPlotPoint,
    start: IPlotPoint,
    control: IPlotPoint,
    end: IPlotPoint,
    segmentCount = 24
) => {
    let minDistance = Number.POSITIVE_INFINITY;
    let previous = start;

    for (let index = 1; index <= segmentCount; index += 1) {
        const t = index / segmentCount;
        const current = getQuadraticPoint(start, control, end, t);
        minDistance = Math.min(minDistance, getPointToSegmentDistance(point, previous, current));
        previous = current;
    }

    return minDistance;
};

export const getPointToSegmentDistance = (
    point: IPlotPoint,
    segmentStart: IPlotPoint,
    segmentEnd: IPlotPoint
) => {
    const dx = segmentEnd.x - segmentStart.x;
    const dy = segmentEnd.y - segmentStart.y;
    const segmentLengthSquared = dx * dx + dy * dy;

    if (segmentLengthSquared === 0) {
        return Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y);
    }

    const projection = Math.max(
        0,
        Math.min(
            1,
            ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) /
                segmentLengthSquared
        )
    );

    const projectedX = segmentStart.x + projection * dx;
    const projectedY = segmentStart.y + projection * dy;
    return Math.hypot(point.x - projectedX, point.y - projectedY);
};

export const getCurveBendFromPoint = (lineObject: ILineObject, point: IPlotPoint) => {
    const { mid, perp } = getLineGeometry({ ...lineObject, curveBend: 0 });
    const offset = (point.x - mid.x) * perp.x + (point.y - mid.y) * perp.y;
    return offset * 2;
};

export const isPointNearLine = (
    lineObject: ILineObject,
    point: IPlotPoint,
    hitRadius = 10
) => {
    if (isCurvedLine(lineObject)) {
        const { start, end, control } = getLineGeometry(lineObject);
        return getPointToQuadraticBezierDistance(point, start, control, end) <= hitRadius;
    }

    return (
        getPointToSegmentDistance(point, { x: lineObject.x, y: lineObject.y }, {
            x: lineObject.x + lineObject.dx,
            y: lineObject.y + lineObject.dy,
        }) <= hitRadius
    );
};

export const isLineOrArrow = (
    boardObject: IBoardObject
): boardObject is ILineObject =>
    boardObject.type === IBoardShapes.LINE || boardObject.type === IBoardShapes.ARROW;

export const countConnectorsBetweenPair = (
    objects: IBoardObject[],
    objectIdA: string,
    objectIdB: string,
    excludeLineId?: string
) =>
    objects.filter((boardObject) => {
        if (boardObject.id === excludeLineId || !isLineOrArrow(boardObject)) {
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
    }).length;

export const computeConnectorBend = (lineObject: ILineObject, objects: IBoardObject[]) => {
    if (!lineObject.fromAttachment || !lineObject.toAttachment) {
        return 0;
    }

    const source = objects.find((item) => item.id === lineObject.fromAttachment?.objectId);
    const target = objects.find((item) => item.id === lineObject.toAttachment?.objectId);
    if (!source || !target) {
        return 0;
    }

    const start = getAnchorPosition(source, lineObject.fromAttachment.side);
    const end = getAnchorPosition(target, lineObject.toAttachment.side);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) {
        return 0;
    }

    const siblingCount = countConnectorsBetweenPair(
        objects,
        lineObject.fromAttachment.objectId,
        lineObject.toAttachment.objectId,
        lineObject.id
    );
    const layer = Math.floor(siblingCount / 2) + 1;
    const direction = siblingCount % 2 === 0 ? 1 : -1;
    const magnitude = Math.min(120, Math.max(32, length * 0.2)) * layer;

    return direction * magnitude;
};
