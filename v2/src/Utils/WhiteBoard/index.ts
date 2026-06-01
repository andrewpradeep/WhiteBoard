import {
    IBoardObject,
    IBoardShapes,
    ICircleObject,
    ILineObject,
    IPlotPoint,
    IRectObject,
    IScribbleObject,
    ITextBoxObject,
} from "../../Contracts/WhiteBoard";
import { jsPDF } from "jspdf";





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
    boardObject: IBoardObject
) => {
    canvasContext.beginPath();
    canvasContext.strokeStyle = "#000";
    canvasContext.lineWidth = 1.5;

    switch (boardObject.type) {
        case IBoardShapes.RECT: {
            const rectObject = boardObject as IRectObject;
            canvasContext.strokeRect(
                rectObject.x,
                rectObject.y,
                rectObject.width,
                rectObject.height
            );
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
            break;
        }
        case IBoardShapes.TRIANGLE: {
            const triangleObject = boardObject as IRectObject;
            canvasContext.moveTo(triangleObject.x + triangleObject.width / 2, triangleObject.y);
            canvasContext.lineTo(triangleObject.x + triangleObject.width, triangleObject.y + triangleObject.height);
            canvasContext.lineTo(triangleObject.x, triangleObject.y + triangleObject.height);
            canvasContext.closePath();
            canvasContext.stroke();
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
            break;
        }
        case IBoardShapes.LINE:
        case IBoardShapes.ARROW: {
            const lineObject = boardObject as ILineObject;
            const startX = lineObject.x;
            const startY = lineObject.y;
            const endX = lineObject.x + lineObject.dx;
            const endY = lineObject.y + lineObject.dy;
            const angle = Math.atan2(endY - startY, endX - startX);
            const arrowHeadLength = 14;

            canvasContext.moveTo(lineObject.x, lineObject.y);
            canvasContext.lineTo(endX, endY);
            canvasContext.stroke();

            if (boardObject.type === IBoardShapes.ARROW && (Math.abs(lineObject.dx) > 1 || Math.abs(lineObject.dy) > 1)) {
                canvasContext.beginPath();
                canvasContext.moveTo(endX, endY);
                canvasContext.lineTo(
                    endX - arrowHeadLength * Math.cos(angle - Math.PI / 6),
                    endY - arrowHeadLength * Math.sin(angle - Math.PI / 6)
                );
                canvasContext.moveTo(endX, endY);
                canvasContext.lineTo(
                    endX - arrowHeadLength * Math.cos(angle + Math.PI / 6),
                    endY - arrowHeadLength * Math.sin(angle + Math.PI / 6)
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
            drawTextBox(canvasContext, boardObject as ITextBoxObject);
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
    canvasContext.font = "13px Helvetica, Arial, sans-serif";
    canvasContext.fillStyle = "#000";
    boardObject.text.split(/\r?\n/).forEach((text, index) => {
        canvasContext.fillText(text, boardObject.x + 12, boardObject.y + (index + 1) * 16 + 8);
    });
};

export const drawSelection = (
    canvasContext: CanvasRenderingContext2D,
    boardObject: IBoardObject
) => {
    canvasContext.save();
    canvasContext.setLineDash([6, 4]);
    canvasContext.strokeStyle = "#3b82f6";
    canvasContext.lineWidth = 1;

    if (boardObject.type === IBoardShapes.LINE || boardObject.type === IBoardShapes.ARROW) {
        const lineObject = boardObject as ILineObject;
        canvasContext.beginPath();
        canvasContext.arc(lineObject.x, lineObject.y, 5, 0, 2 * Math.PI);
        canvasContext.stroke();
        canvasContext.beginPath();
        canvasContext.arc(
            lineObject.x + lineObject.dx,
            lineObject.y + lineObject.dy,
            5,
            0,
            2 * Math.PI
        );
        canvasContext.stroke();
    } else if (boardObject.type === IBoardShapes.CIRCLE) {
        const circleObject = boardObject as ICircleObject;
        canvasContext.strokeRect(
            circleObject.x - circleObject.radius - 8,
            circleObject.y - circleObject.radius - 8,
            circleObject.radius * 2 + 16,
            circleObject.radius * 2 + 16
        );
        canvasContext.fillStyle = "#3b82f6";
        canvasContext.beginPath();
        canvasContext.arc(circleObject.x + circleObject.radius, circleObject.y, 4, 0, 2 * Math.PI);
        canvasContext.fill();
    } else if (boardObject.type === IBoardShapes.SCRIBBLE) {
        const scribbleObject = boardObject as IScribbleObject;
        const points = [{ x: scribbleObject.x, y: scribbleObject.y }, ...scribbleObject.path];
        const xValues = points.map((point) => point.x);
        const yValues = points.map((point) => point.y);
        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);
        const minY = Math.min(...yValues);
        const maxY = Math.max(...yValues);
        canvasContext.strokeRect(minX - 8, minY - 8, maxX - minX + 16, maxY - minY + 16);
    } else {
        const rectObject = boardObject as IRectObject;
        canvasContext.strokeRect(
            rectObject.x - 8,
            rectObject.y - 8,
            rectObject.width + 16,
            rectObject.height + 16
        );
        canvasContext.fillStyle = "#3b82f6";
        canvasContext.fillRect(
            rectObject.x + rectObject.width - 4,
            rectObject.y + rectObject.height - 4,
            8,
            8
        );
    }

    canvasContext.restore();
};

export const renderBoard = ({
    canvasContext,
    canvasRef,
    objects,
    selectedObject,
    includeGrid = true,
}: {
    canvasContext: CanvasRenderingContext2D;
    canvasRef: HTMLCanvasElement;
    objects: IBoardObject[];
    selectedObject?: { id: string } | null;
    includeGrid?: boolean;
}) => {
    clearCanvas(canvasContext, canvasRef);
    if (includeGrid) {
        drawBackGround(canvasContext, canvasRef);
    } else {
        drawWhiteBackground(canvasContext, canvasRef.width, canvasRef.height);
    }

    objects.forEach((boardObject) => {
        drawBoardObject(canvasContext, boardObject);
    });

    if (selectedObject) {
        const boardObject = objects.find((item) => item.id === selectedObject.id);
        if (boardObject) {
            drawSelection(canvasContext, boardObject);
        }
    }
};

export const getDistanceOfPoints = (point1: IPlotPoint, point2: IPlotPoint) => {
    return Math.sqrt(
        Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
    );
};

const getPointToSegmentDistance = (
    point: IPlotPoint,
    segmentStart: IPlotPoint,
    segmentEnd: IPlotPoint
) => {
    const dx = segmentEnd.x - segmentStart.x;
    const dy = segmentEnd.y - segmentStart.y;
    const segmentLengthSquared = dx * dx + dy * dy;

    if (segmentLengthSquared === 0) {
        return getDistanceOfPoints(point, segmentStart);
    }

    const projection = Math.max(
        0,
        Math.min(
            1,
            ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) /
                segmentLengthSquared
        )
    );

    return getDistanceOfPoints(point, {
        x: segmentStart.x + projection * dx,
        y: segmentStart.y + projection * dy,
    });
};

export const downloadBoardAsPdf = ({
    objects,
    width,
    height,
    fileName,
}: {
    objects: IBoardObject[];
    width: number;
    height: number;
    fileName: string;
}) => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportContext = exportCanvas.getContext("2d");

    if (!exportContext) {
        return;
    }

    renderBoard({
        canvasContext: exportContext,
        canvasRef: exportCanvas,
        objects,
        includeGrid: false,
    });

    const pdf = new jsPDF({
        orientation: width > height ? "landscape" : "portrait",
        unit: "px",
        format: [width, height],
    });
    pdf.addImage(exportCanvas.toDataURL("image/png"), "PNG", 0, 0, width, height);
    pdf.save(`${fileName.replace(/[^\w-]+/g, "-").toLowerCase() || "whiteboard"}.pdf`);
};

export const downloadBoardAsPng = ({
    objects,
    width,
    height,
    fileName,
}: {
    objects: IBoardObject[];
    width: number;
    height: number;
    fileName: string;
}) => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportContext = exportCanvas.getContext("2d");

    if (!exportContext) {
        return;
    }

    renderBoard({
        canvasContext: exportContext,
        canvasRef: exportCanvas,
        objects,
        includeGrid: false,
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
        case IBoardShapes.TRIANGLE:
        case IBoardShapes.STAR:
        {
            const tempObject = boardObject as IRectObject;
            return (
                clickX > tempObject.x &&
                clickX < tempObject.x + tempObject.width &&
                clickY > tempObject.y &&
                clickY < tempObject.y + tempObject.height
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
            const {x,y} = tempObject;
            const dx = x + tempObject.dx;
            const dy = y+tempObject.dy
            return (
                getPointToSegmentDistance(
                    { x: clickX, y: clickY },
                    { x, y },
                    { x: dx, y: dy }
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



