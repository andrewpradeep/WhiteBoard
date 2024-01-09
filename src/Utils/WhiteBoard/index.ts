import {
    BoardObject,
    BoardShapes,
    CircleObject,
    LineObject,
    PlotPoint,
    SquareObject,
} from "../../Contracts/WhiteBoard";

export const drawShapes = (
    boardObject: BoardObject,
    canvasContext: CanvasRenderingContext2D
) => {
    switch (boardObject.type) {
        case BoardShapes.SQUARE:
            drawRect(boardObject as SquareObject, canvasContext);
            break;
        case BoardShapes.CIRCLE:
            drawCircle(boardObject as CircleObject, canvasContext);
            break;
        case BoardShapes.LINE:
            drawLine(boardObject as LineObject, canvasContext);
            break;
        default:
            return;
    }
};

const drawRect = (
    boardObject: SquareObject,
    canvasContext: CanvasRenderingContext2D
) => {
    canvasContext?.strokeRect(
        boardObject.x,
        boardObject.y,
        boardObject.width,
        boardObject.height
    );
    canvasContext?.strokeRect(
        boardObject.x,
        boardObject.y,
        boardObject.width,
        boardObject.height
    );
};

const drawCircle = (
    boardObject: CircleObject,
    canvasContext: CanvasRenderingContext2D
) => {
    canvasContext?.arc(
        boardObject.x,
        boardObject.y,
        boardObject.radius,
        0,
        2 * Math.PI
    );
    canvasContext?.stroke();
};

const drawLine = (
    boardObject: LineObject,
    canvasContext: CanvasRenderingContext2D
) => {
    canvasContext.moveTo(boardObject.x, boardObject.y);
    canvasContext.lineTo(boardObject.dx, boardObject.dy);
    canvasContext?.stroke();
};

export const getDistanceOfPoints = (point1: PlotPoint, point2: PlotPoint) => {
    return Math.sqrt(
        Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
    );
};
