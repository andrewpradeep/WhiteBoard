import {
    IBoardObject,
    IBoardShapes,
    ICircleObject,
    ILineObject,
    IPlotPoint,
    IRectObject,
    IScribbleObject,
    ITextBoxObject,
    IViewport,
} from "../../Contracts/WhiteBoard";
import { DEFAULT_VIEWPORT, getCanvasPixelRatio, getStrokeWorldWidth } from "../viewport";
import {
    getShapeAnchors,
    getShapeBounds,
    isConnectableShape,
    resolveLineAttachments,
} from "../anchorGeometry";
import {
    getArrowEndAngle,
    getLineGeometry,
    getPointToQuadraticBezierDistance,
    getPointToSegmentDistance,
    isCurvedLine,
} from "../lineGeometry";
import { drawClippedShapeText } from "../shapeText";

export const SELECTION_PADDING = 8;
export const EXPORT_PADDING_PX = 20;

export interface BoardContentBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

const expandBounds = (
    bounds: BoardContentBounds,
    padding: number
): BoardContentBounds => ({
    left: bounds.left - padding,
    top: bounds.top - padding,
    right: bounds.right + padding,
    bottom: bounds.bottom + padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
});

const mergeBounds = (
    aggregate: BoardContentBounds | null,
    next: BoardContentBounds
): BoardContentBounds => {
    if (!aggregate) {
        return next;
    }

    const left = Math.min(aggregate.left, next.left);
    const top = Math.min(aggregate.top, next.top);
    const right = Math.max(aggregate.right, next.right);
    const bottom = Math.max(aggregate.bottom, next.bottom);

    return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
    };
};

const getObjectExportBounds = (
    boardObject: IBoardObject,
    strokeWidth: number
): BoardContentBounds | null => {
    const strokePadding = strokeWidth / 2 + 1;

    if (boardObject.type === IBoardShapes.LINE || boardObject.type === IBoardShapes.ARROW) {
        const lineObject = boardObject as ILineObject;
        const { start, end, control } = getLineGeometry(lineObject);
        let left = Math.min(start.x, end.x, control.x);
        let right = Math.max(start.x, end.x, control.x);
        let top = Math.min(start.y, end.y, control.y);
        let bottom = Math.max(start.y, end.y, control.y);

        const showArrowHead =
            (boardObject.type === IBoardShapes.ARROW || lineObject.fromAttachment) &&
            (Math.abs(lineObject.dx) > 1 || Math.abs(lineObject.dy) > 1);

        if (showArrowHead) {
            const angle = getArrowEndAngle(lineObject);
            const arrowHeadLength = Math.max(12, strokeWidth * 6);

            for (const wingAngle of [angle - Math.PI / 6, angle + Math.PI / 6]) {
                const wingX = end.x - arrowHeadLength * Math.cos(wingAngle);
                const wingY = end.y - arrowHeadLength * Math.sin(wingAngle);
                left = Math.min(left, wingX);
                right = Math.max(right, wingX);
                top = Math.min(top, wingY);
                bottom = Math.max(bottom, wingY);
            }
        }

        return expandBounds(
            {
                left,
                top,
                right,
                bottom,
                width: right - left,
                height: bottom - top,
            },
            strokePadding
        );
    }

    const shapeBounds = getShapeBounds(boardObject);
    return expandBounds(
        {
            left: shapeBounds.left,
            top: shapeBounds.top,
            right: shapeBounds.right,
            bottom: shapeBounds.bottom,
            width: shapeBounds.right - shapeBounds.left,
            height: shapeBounds.bottom - shapeBounds.top,
        },
        strokePadding
    );
};

export const getBoardContentBounds = (
    objects: IBoardObject[],
    strokeWidth = getStrokeWorldWidth(DEFAULT_VIEWPORT, window.devicePixelRatio || 1)
): BoardContentBounds | null => {
    if (!objects.length) {
        return null;
    }

    const preparedObjects = objects.map((boardObject) => {
        if (boardObject.type === IBoardShapes.LINE || boardObject.type === IBoardShapes.ARROW) {
            return {
                ...boardObject,
                ...resolveLineAttachments(boardObject as ILineObject, objects),
            };
        }

        return boardObject;
    });

    return preparedObjects.reduce<BoardContentBounds | null>((aggregate, boardObject) => {
        const bounds = getObjectExportBounds(boardObject, strokeWidth);
        return bounds ? mergeBounds(aggregate, bounds) : aggregate;
    }, null);
};

export type ResizeHandleType = "bottom-right" | "radius";

export interface SelectionBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

export const getSelectionBounds = (boardObject: IBoardObject): SelectionBounds | null => {
    switch (boardObject.type) {
        case IBoardShapes.RECT:
        case IBoardShapes.SQUARE:
        case IBoardShapes.OVAL:
        case IBoardShapes.TRIANGLE:
        case IBoardShapes.STAR:
        case IBoardShapes.TEXT_BOX: {
            const rectObject = boardObject as IRectObject;
            return {
                left: rectObject.x - SELECTION_PADDING,
                top: rectObject.y - SELECTION_PADDING,
                right: rectObject.x + rectObject.width + SELECTION_PADDING,
                bottom: rectObject.y + rectObject.height + SELECTION_PADDING,
                width: rectObject.width + SELECTION_PADDING * 2,
                height: rectObject.height + SELECTION_PADDING * 2,
            };
        }
        case IBoardShapes.CONTAINER: {
            const containerObject = boardObject as IRectObject;
            return {
                left: containerObject.x - SELECTION_PADDING,
                top: containerObject.y - SELECTION_PADDING,
                right: containerObject.x + containerObject.width + SELECTION_PADDING,
                bottom: containerObject.y + containerObject.height + SELECTION_PADDING,
                width: containerObject.width + SELECTION_PADDING * 2,
                height: containerObject.height + SELECTION_PADDING * 2,
            };
        }
        case IBoardShapes.CIRCLE: {
            const circleObject = boardObject as ICircleObject;
            return {
                left: circleObject.x - circleObject.radius - SELECTION_PADDING,
                top: circleObject.y - circleObject.radius - SELECTION_PADDING,
                right: circleObject.x + circleObject.radius + SELECTION_PADDING,
                bottom: circleObject.y + circleObject.radius + SELECTION_PADDING,
                width: circleObject.radius * 2 + SELECTION_PADDING * 2,
                height: circleObject.radius * 2 + SELECTION_PADDING * 2,
            };
        }
        case IBoardShapes.SCRIBBLE: {
            const scribbleObject = boardObject as IScribbleObject;
            const points = [{ x: scribbleObject.x, y: scribbleObject.y }, ...scribbleObject.path];
            const left = Math.min(...points.map((point) => point.x)) - SELECTION_PADDING;
            const right = Math.max(...points.map((point) => point.x)) + SELECTION_PADDING;
            const top = Math.min(...points.map((point) => point.y)) - SELECTION_PADDING;
            const bottom = Math.max(...points.map((point) => point.y)) + SELECTION_PADDING;
            return {
                left,
                top,
                right,
                bottom,
                width: right - left,
                height: bottom - top,
            };
        }
        default:
            return null;
    }
};

export const getResizeHandleCenter = (
    boardObject: IBoardObject
): { point: IPlotPoint; type: ResizeHandleType } | null => {
    const bounds = getSelectionBounds(boardObject);
    if (!bounds) {
        return null;
    }

    if (boardObject.type === IBoardShapes.CIRCLE) {
        return {
            point: { x: bounds.right, y: bounds.bottom },
            type: "radius",
        };
    }

    if (
        boardObject.type === IBoardShapes.RECT ||
        boardObject.type === IBoardShapes.SQUARE ||
        boardObject.type === IBoardShapes.OVAL ||
        boardObject.type === IBoardShapes.TRIANGLE ||
        boardObject.type === IBoardShapes.STAR ||
        boardObject.type === IBoardShapes.TEXT_BOX ||
        boardObject.type === IBoardShapes.CONTAINER
    ) {
        return {
            point: { x: bounds.right, y: bounds.bottom },
            type: "bottom-right",
        };
    }

    return null;
};

export const getResizeHandleWorldSize = (
    canvasRef: HTMLCanvasElement,
    viewport?: IViewport
) => {
    const pixelRatio = getCanvasPixelRatio(canvasRef);
    return Math.max(8, getStrokeWorldWidth(viewport ?? { scale: 1, offsetX: 0, offsetY: 0 }, pixelRatio) * 4);
};

export const drawResizeHandle = (
    canvasContext: CanvasRenderingContext2D,
    boardObject: IBoardObject,
    canvasRef: HTMLCanvasElement,
    viewport?: IViewport
) => {
    const handle = getResizeHandleCenter(boardObject);
    if (!handle) {
        return;
    }

    const handleSize = getResizeHandleWorldSize(canvasRef, viewport);
    canvasContext.save();
    canvasContext.setLineDash([]);
    canvasContext.fillStyle = "#3b82f6";
    canvasContext.fillRect(
        handle.point.x - handleSize / 2,
        handle.point.y - handleSize / 2,
        handleSize,
        handleSize
    );
    canvasContext.restore();
};

export const getResizeHandleAtPoint = (
    boardObject: IBoardObject,
    point: IPlotPoint,
    hitRadius = 12
): ResizeHandleType | undefined => {
    const handle = getResizeHandleCenter(boardObject);
    if (!handle) {
        return undefined;
    }

    return getDistanceOfPoints(handle.point, point) <= hitRadius ? handle.type : undefined;
};


export const drawBackGround = (canvasContext:CanvasRenderingContext2D,canvasRef:HTMLCanvasElement | null) => {
    const width = canvasRef?.width as number;
    const height = canvasRef?.height as number;
    const gridSize = 80;

    canvasContext.fillStyle = "#ffffff";
    canvasContext.fillRect(0, 0, width, height);
    canvasContext.save();
    canvasContext.strokeStyle = "rgba(15, 23, 42, 0.035)";
    canvasContext.lineWidth = 1;

    for (let x = 0; x <= width; x += gridSize) {
        canvasContext.beginPath();
        canvasContext.moveTo(x, 0);
        canvasContext.lineTo(x, height);
        canvasContext.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
        canvasContext.beginPath();
        canvasContext.moveTo(0, y);
        canvasContext.lineTo(width, y);
        canvasContext.stroke();
    }

    canvasContext.restore();
};

export const drawWhiteBackground = (
    canvasContext: CanvasRenderingContext2D,
    width: number,
    height: number
) => {
    canvasContext.fillStyle = "white";
    canvasContext.fillRect(0, 0, width, height);
};

export const clearCanvas = (canvasContext:CanvasRenderingContext2D | undefined | null,canvasRef:HTMLCanvasElement | null) => {
    canvasContext?.clearRect(
        0,
        0,
        canvasRef?.width as number,
        canvasRef?.height as number
    );
};

export const drawBoardObject = (
    canvasContext: CanvasRenderingContext2D,
    boardObject: IBoardObject,
    canvasRef: HTMLCanvasElement,
    viewport?: IViewport
) => {
    const pixelRatio = getCanvasPixelRatio(canvasRef);
    const strokeWidth = getStrokeWorldWidth(viewport ?? { scale: 1, offsetX: 0, offsetY: 0 }, pixelRatio);

    canvasContext.beginPath();
    canvasContext.strokeStyle = "#000";
    canvasContext.lineWidth = strokeWidth;
    canvasContext.lineCap = "round";
    canvasContext.lineJoin = "round";

    switch (boardObject.type) {
        case IBoardShapes.RECT: {
            const rectObject = boardObject as IRectObject;
            canvasContext.strokeRect(
                rectObject.x,
                rectObject.y,
                rectObject.width,
                rectObject.height
            );
            drawClippedShapeText(canvasContext, boardObject);
            break;
        }
        case IBoardShapes.CONTAINER: {
            const containerObject = boardObject as IRectObject;
            canvasContext.save();
            canvasContext.fillStyle = "rgba(0, 113, 227, 0.04)";
            canvasContext.fillRect(
                containerObject.x,
                containerObject.y,
                containerObject.width,
                containerObject.height
            );
            canvasContext.setLineDash([8, 6]);
            canvasContext.strokeStyle = "#000";
            canvasContext.lineWidth = strokeWidth;
            canvasContext.strokeRect(
                containerObject.x,
                containerObject.y,
                containerObject.width,
                containerObject.height
            );
            canvasContext.setLineDash([]);
            canvasContext.restore();
            break;
        }
        case IBoardShapes.OVAL: {
            const ovalObject = boardObject as IRectObject;
            canvasContext.ellipse(
                ovalObject.x + ovalObject.width / 2,
                ovalObject.y + ovalObject.height / 2,
                Math.abs(ovalObject.width / 2),
                Math.abs(ovalObject.height / 2),
                0,
                0,
                2 * Math.PI
            );
            canvasContext.stroke();
            drawClippedShapeText(canvasContext, boardObject);
            break;
        }
        case IBoardShapes.TRIANGLE: {
            const triangleObject = boardObject as IRectObject;
            canvasContext.moveTo(triangleObject.x + triangleObject.width / 2, triangleObject.y);
            canvasContext.lineTo(triangleObject.x + triangleObject.width, triangleObject.y + triangleObject.height);
            canvasContext.lineTo(triangleObject.x, triangleObject.y + triangleObject.height);
            canvasContext.closePath();
            canvasContext.stroke();
            drawClippedShapeText(canvasContext, boardObject);
            break;
        }
        case IBoardShapes.STAR: {
            const starObject = boardObject as IRectObject;
            const centerX = starObject.x + starObject.width / 2;
            const centerY = starObject.y + starObject.height / 2;
            const outerRadius = Math.min(Math.abs(starObject.width), Math.abs(starObject.height)) / 2;
            const innerRadius = outerRadius / 2.4;

            for (let i = 0; i < 10; i += 1) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = -Math.PI / 2 + (i * Math.PI) / 5;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                if (i === 0) {
                    canvasContext.moveTo(x, y);
                } else {
                    canvasContext.lineTo(x, y);
                }
            }
            canvasContext.closePath();
            canvasContext.stroke();
            drawClippedShapeText(canvasContext, boardObject);
            break;
        }
        case IBoardShapes.CIRCLE: {
            const circleObject = boardObject as ICircleObject;
            canvasContext.arc(
                circleObject.x,
                circleObject.y,
                circleObject.radius,
                0,
                2 * Math.PI
            );
            canvasContext.stroke();
            drawClippedShapeText(canvasContext, boardObject);
            break;
        }
        case IBoardShapes.LINE:
        case IBoardShapes.ARROW: {
            const lineObject = boardObject as ILineObject;
            const { start, end, control } = getLineGeometry(lineObject);

            canvasContext.moveTo(start.x, start.y);
            canvasContext.quadraticCurveTo(control.x, control.y, end.x, end.y);
            canvasContext.stroke();

            const showArrowHead =
                (boardObject.type === IBoardShapes.ARROW || lineObject.fromAttachment) &&
                (Math.abs(lineObject.dx) > 1 || Math.abs(lineObject.dy) > 1);

            if (showArrowHead) {
                const angle = getArrowEndAngle(lineObject);
                const arrowHeadLength = Math.max(12, strokeWidth * 6);

                canvasContext.beginPath();
                canvasContext.moveTo(end.x, end.y);
                canvasContext.lineTo(
                    end.x - arrowHeadLength * Math.cos(angle - Math.PI / 6),
                    end.y - arrowHeadLength * Math.sin(angle - Math.PI / 6)
                );
                canvasContext.moveTo(end.x, end.y);
                canvasContext.lineTo(
                    end.x - arrowHeadLength * Math.cos(angle + Math.PI / 6),
                    end.y - arrowHeadLength * Math.sin(angle + Math.PI / 6)
                );
                canvasContext.stroke();
            }
            break;
        }
        case IBoardShapes.SCRIBBLE: {
            const scribbleObject = boardObject as IScribbleObject;
            canvasContext.moveTo(scribbleObject.x, scribbleObject.y);
            scribbleObject.path.forEach((point) => {
                canvasContext.lineTo(point.x, point.y);
            });
            canvasContext.stroke();
            break;
        }
        case IBoardShapes.TEXT_BOX: {
            const textBoxObject = boardObject as ITextBoxObject;
            canvasContext.strokeRect(
                textBoxObject.x,
                textBoxObject.y,
                textBoxObject.width,
                textBoxObject.height
            );
            drawClippedShapeText(canvasContext, boardObject);
            break;
        }
        default:
            break;
    }

    canvasContext.closePath();
};

export const drawTextBox = (
    canvasContext: CanvasRenderingContext2D,
    boardObject: ITextBoxObject
) => {
    canvasContext.strokeRect(
        boardObject.x,
        boardObject.y,
        boardObject.width,
        boardObject.height
    );
    drawClippedShapeText(canvasContext, boardObject);
};

export const drawShapeAnchors = (
    canvasContext: CanvasRenderingContext2D,
    boardObject: IBoardObject,
    canvasRef: HTMLCanvasElement,
    viewport?: IViewport,
    highlighted = false
) => {
    if (!isConnectableShape(boardObject)) {
        return;
    }

    const pixelRatio = getCanvasPixelRatio(canvasRef);
    const strokeWidth = getStrokeWorldWidth(viewport ?? { scale: 1, offsetX: 0, offsetY: 0 }, pixelRatio);
    const radius = Math.max(4, strokeWidth * 2.5);

    canvasContext.save();
    canvasContext.lineWidth = strokeWidth;
    canvasContext.strokeStyle = "#3b82f6";
    canvasContext.fillStyle = highlighted ? "#dbeafe" : "#ffffff";

    getShapeAnchors(boardObject).forEach((anchor) => {
        canvasContext.beginPath();
        canvasContext.arc(anchor.x, anchor.y, radius, 0, 2 * Math.PI);
        canvasContext.fill();
        canvasContext.stroke();
    });

    canvasContext.restore();
};

export const drawSelection = (
    canvasContext: CanvasRenderingContext2D,
    boardObject: IBoardObject,
    canvasRef: HTMLCanvasElement,
    viewport?: IViewport
) => {
    const pixelRatio = getCanvasPixelRatio(canvasRef);
    const strokeWidth = getStrokeWorldWidth(viewport ?? { scale: 1, offsetX: 0, offsetY: 0 }, pixelRatio);

    canvasContext.save();
    canvasContext.setLineDash([6, 4]);
    canvasContext.strokeStyle = "#3b82f6";
    canvasContext.lineWidth = strokeWidth;
    canvasContext.lineCap = "round";
    canvasContext.lineJoin = "round";

    if (boardObject.type === IBoardShapes.LINE || boardObject.type === IBoardShapes.ARROW) {
        const lineObject = boardObject as ILineObject;
        const { start, end, curveMidpoint } = getLineGeometry(lineObject);

        canvasContext.beginPath();
        canvasContext.arc(start.x, start.y, 5, 0, 2 * Math.PI);
        canvasContext.stroke();
        canvasContext.beginPath();
        canvasContext.arc(end.x, end.y, 5, 0, 2 * Math.PI);
        canvasContext.stroke();
        canvasContext.beginPath();
        canvasContext.arc(curveMidpoint.x, curveMidpoint.y, 5, 0, 2 * Math.PI);
        canvasContext.stroke();
    } else if (boardObject.type === IBoardShapes.CIRCLE) {
        const bounds = getSelectionBounds(boardObject);
        if (bounds) {
            canvasContext.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
        }
        drawResizeHandle(canvasContext, boardObject, canvasRef, viewport);
        drawShapeAnchors(canvasContext, boardObject, canvasRef, viewport, true);
    } else if (boardObject.type === IBoardShapes.SCRIBBLE) {
        const bounds = getSelectionBounds(boardObject);
        if (bounds) {
            canvasContext.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
        }
    } else {
        const bounds = getSelectionBounds(boardObject);
        if (bounds) {
            canvasContext.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
        }
        drawResizeHandle(canvasContext, boardObject, canvasRef, viewport);
        drawShapeAnchors(canvasContext, boardObject, canvasRef, viewport, true);
    }

    canvasContext.restore();
};

export const renderBoard = ({
    canvasContext,
    canvasRef,
    objects,
    selectedObject,
    includeGrid = true,
    viewport,
    showConnectionAnchors = false,
    showElementNames = false,
}: {
    canvasContext: CanvasRenderingContext2D;
    canvasRef: HTMLCanvasElement;
    objects: IBoardObject[];
    selectedObject?: { id: string } | null;
    includeGrid?: boolean;
    viewport?: IViewport;
    showConnectionAnchors?: boolean;
    showElementNames?: boolean;
}) => {
    clearCanvas(canvasContext, canvasRef);

    if (viewport) {
        canvasContext.save();
        canvasContext.setTransform(
            viewport.scale,
            0,
            0,
            viewport.scale,
            viewport.offsetX,
            viewport.offsetY
        );
    }

    if (includeGrid) {
        drawBackGround(canvasContext, canvasRef);
    } else {
        drawWhiteBackground(canvasContext, canvasRef.width, canvasRef.height);
    }

    const renderObjects = objects.map((boardObject) => {
        if (boardObject.type === IBoardShapes.LINE || boardObject.type === IBoardShapes.ARROW) {
            return {
                ...boardObject,
                ...resolveLineAttachments(boardObject as ILineObject, objects),
            };
        }

        return boardObject;
    });

    renderObjects.forEach((boardObject) => {
        drawBoardObject(canvasContext, boardObject, canvasRef, viewport);
    });

    if (showElementNames) {
        renderObjects.forEach((boardObject) => {
            drawElementNameLabel(canvasContext, boardObject, canvasRef, viewport);
        });
    }

    if (showConnectionAnchors) {
        renderObjects.forEach((boardObject) => {
            if (isConnectableShape(boardObject) && boardObject.id !== selectedObject?.id) {
                drawShapeAnchors(canvasContext, boardObject, canvasRef, viewport);
            }
        });
    }

    if (selectedObject) {
        const boardObject = renderObjects.find((item) => item.id === selectedObject.id);
        if (boardObject) {
            drawSelection(canvasContext, boardObject, canvasRef, viewport);
        }
    }

    if (viewport) {
        canvasContext.restore();
    }
};

export const getDistanceOfPoints = (point1: IPlotPoint, point2: IPlotPoint) => {
    return Math.sqrt(
        Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
    );
};

export const downloadBoardAsPng = ({
    objects,
    fileName,
}: {
    objects: IBoardObject[];
    fileName: string;
}) => {
    const exportCanvas = document.createElement("canvas");
    const strokeWidth = getStrokeWorldWidth(DEFAULT_VIEWPORT, window.devicePixelRatio || 1);
    const contentBounds = getBoardContentBounds(objects, strokeWidth);
    const padding = EXPORT_PADDING_PX;

    let exportWidth = padding * 2;
    let exportHeight = padding * 2;
    let viewport: IViewport = { scale: 1, offsetX: padding, offsetY: padding };

    if (contentBounds) {
        exportWidth = Math.max(1, Math.ceil(contentBounds.width + padding * 2));
        exportHeight = Math.max(1, Math.ceil(contentBounds.height + padding * 2));
        viewport = {
            scale: 1,
            offsetX: padding - contentBounds.left,
            offsetY: padding - contentBounds.top,
        };
    }

    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const exportContext = exportCanvas.getContext("2d");

    if (!exportContext) {
        return;
    }

    renderBoard({
        canvasContext: exportContext,
        canvasRef: exportCanvas,
        objects,
        includeGrid: false,
        viewport,
    });

    const link = document.createElement("a");
    link.href = exportCanvas.toDataURL("image/png");
    link.download = `${fileName.replace(/[^\w-]+/g, "-").toLowerCase() || "whiteboard"}.png`;
    link.click();
};


export const isBoardObjectSelected = (
    boardObject: IBoardObject,
    clickX: number,
    clickY: number
) => {
    switch (boardObject.type) {
        case IBoardShapes.RECT:
        case IBoardShapes.CONTAINER:
        case IBoardShapes.TRIANGLE:
        case IBoardShapes.STAR:
        {
            const tempObject = boardObject as IRectObject;
            return (
                clickX >= tempObject.x &&
                clickX <= tempObject.x + tempObject.width &&
                clickY >= tempObject.y &&
                clickY <= tempObject.y + tempObject.height
            );
        }
        case IBoardShapes.OVAL:
        {
            const tempObject = boardObject as IRectObject;
            const radiusX = tempObject.width / 2;
            const radiusY = tempObject.height / 2;
            const centerX = tempObject.x + radiusX;
            const centerY = tempObject.y + radiusY;
            if (radiusX === 0 || radiusY === 0) {
                return false;
            }

            return (
                Math.pow((clickX - centerX) / radiusX, 2) +
                    Math.pow((clickY - centerY) / radiusY, 2) <=
                1
            );
        }
        case IBoardShapes.TEXT_BOX:
        {
            const tempObject = boardObject as IRectObject;
            return (
                clickX > tempObject.x -15&&
                clickX < tempObject.x + tempObject.width +15 &&
                clickY > tempObject.y -15 &&
                clickY < tempObject.y + tempObject.height+15
            );
        }
        case IBoardShapes.CIRCLE: {
            const tempObject = boardObject as ICircleObject;
            return (
                clickX > tempObject.x - tempObject.radius &&
                clickX < tempObject.x + tempObject.radius &&
                clickY > tempObject.y - tempObject.radius &&
                clickY < tempObject.y + tempObject.radius
            );
        }
        case IBoardShapes.LINE:
        case IBoardShapes.ARROW: {
            const tempObject = boardObject as ILineObject;
            if (isCurvedLine(tempObject)) {
                const { start, end, control } = getLineGeometry(tempObject);
                return (
                    getPointToQuadraticBezierDistance(
                        { x: clickX, y: clickY },
                        start,
                        control,
                        end
                    ) <= 10
                );
            }

            const endX = tempObject.x + tempObject.dx;
            const endY = tempObject.y + tempObject.dy;
            return (
                getPointToSegmentDistance(
                    { x: clickX, y: clickY },
                    { x: tempObject.x, y: tempObject.y },
                    { x: endX, y: endY }
                ) <= 10
            );
        }
        case IBoardShapes.SCRIBBLE: {
            const tempObject = boardObject as IScribbleObject;
            const path = [{ x: tempObject.x, y: tempObject.y }, ...tempObject.path];
            return path.some((point, index) => {
                const nextPoint = path[index + 1];
                if (!nextPoint) {
                    return getDistanceOfPoints(point, { x: clickX, y: clickY }) <= 10;
                }

                return (
                    getPointToSegmentDistance(
                        { x: clickX, y: clickY },
                        point,
                        nextPoint
                    ) <= 10
                );
            });
        }
        default:
            return false;
    }
};

export const findSelectedObjectAtPoint = (
    objects: IBoardObject[],
    clickX: number,
    clickY: number
) => {
    for (let index = objects.length - 1; index >= 0; index -= 1) {
        const boardObject = objects[index];
        if (boardObject.type === IBoardShapes.CONTAINER) {
            continue;
        }

        if (isBoardObjectSelected(boardObject, clickX, clickY)) {
            return boardObject;
        }
    }

    for (let index = objects.length - 1; index >= 0; index -= 1) {
        const boardObject = objects[index];
        if (boardObject.type !== IBoardShapes.CONTAINER) {
            continue;
        }

        if (isBoardObjectSelected(boardObject, clickX, clickY)) {
            return boardObject;
        }
    }

    return null;
};

export const drawElementNameLabel = (
    canvasContext: CanvasRenderingContext2D,
    boardObject: IBoardObject,
    canvasRef: HTMLCanvasElement,
    viewport?: IViewport
) => {
    if (!boardObject.displayName) {
        return;
    }

    const bounds = getShapeBounds(boardObject);
    const pixelRatio = getCanvasPixelRatio(canvasRef);
    const fontSize = Math.max(
        11,
        getStrokeWorldWidth(viewport ?? { scale: 1, offsetX: 0, offsetY: 0 }, pixelRatio) * 3.5
    );
    const label = boardObject.displayName;
    const centerX = (bounds.left + bounds.right) / 2;
    const labelY = bounds.top - 6;

    canvasContext.save();
    canvasContext.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    const textWidth = canvasContext.measureText(label).width;
    const paddingX = 6;
    const paddingY = 3;
    const pillHeight = fontSize + paddingY * 2;
    const pillWidth = textWidth + paddingX * 2;
    const pillX = centerX - pillWidth / 2;
    const pillY = labelY - pillHeight + paddingY;

    canvasContext.fillStyle = "rgba(255, 255, 255, 0.92)";
    canvasContext.strokeStyle = "rgba(0, 113, 227, 0.45)";
    canvasContext.lineWidth = 1;
    canvasContext.beginPath();
    canvasContext.roundRect(pillX, pillY, pillWidth, pillHeight, 4);
    canvasContext.fill();
    canvasContext.stroke();

    canvasContext.fillStyle = "#0071e3";
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "bottom";
    canvasContext.fillText(label, centerX, labelY);
    canvasContext.restore();
};


