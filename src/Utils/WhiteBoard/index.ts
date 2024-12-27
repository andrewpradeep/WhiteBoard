import {
    BoardObject,
    BoardShapes,
    CircleObject,
    LineObject,
    PlotPoint,
    RectObject,
    ScribbleObject,
} from "../../Contracts/WhiteBoard";

export const drawShapes = (
    boardObject: BoardObject,
    canvasContext: CanvasRenderingContext2D
) => {
    switch (boardObject.type) {
        case BoardShapes.RECT:
            drawRect(boardObject as RectObject, canvasContext);
            break;
        case BoardShapes.CIRCLE:
            drawCircle(boardObject as CircleObject, canvasContext);
            break;
        case BoardShapes.LINE:
            drawLine(boardObject as LineObject, canvasContext);
            break;
        case BoardShapes.SCRIBBLE:
            drawScribble(boardObject as ScribbleObject,canvasContext);
            break;
        default:
            return;
    }
};

const drawRect = (
    boardObject: RectObject,
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

const drawScribble = (
    boardObject: ScribbleObject,
    canvasContext: CanvasRenderingContext2D
) => {
    canvasContext.moveTo(boardObject.x, boardObject.y);
    boardObject.path.forEach((PlotPoint)=>{
        canvasContext.lineTo(PlotPoint.x, PlotPoint.y);
    });
    canvasContext?.stroke();
}

export const getDistanceOfPoints = (point1: PlotPoint, point2: PlotPoint) => {
    return Math.sqrt(
        Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
    );
};


export const isBoardObjectSelected = (
    boardObject: BoardObject,
    clickX: number,
    clickY: number
) => {
    switch (boardObject.type) {
        case BoardShapes.RECT: {
            // eslint-disable-next-line no-case-declarations
            const tempObject = boardObject as RectObject;
            return (
                clickX > tempObject.x &&
                clickX < tempObject.x + tempObject.width &&
                clickY > tempObject.y &&
                clickY < tempObject.y + tempObject.height
            );
        }
        case BoardShapes.CIRCLE: {
            // eslint-disable-next-line no-case-declarations
            const tempObject = boardObject as CircleObject;
            return (
                clickX > tempObject.x - tempObject.radius &&
                clickX < tempObject.x + tempObject.radius &&
                clickY > tempObject.y - tempObject.radius &&
                clickY < tempObject.y + tempObject.radius
            );
        }
        case BoardShapes.LINE: {
            const tempObject = boardObject as LineObject;

            return (
                (clickX > tempObject.x - 10 &&
                    clickX < tempObject.x + 10 &&
                    clickY > tempObject.y - 10 &&
                    clickY < tempObject.y + 10) ||
                (clickX > tempObject.dx - 10 &&
                    clickX < tempObject.dx + 10 &&
                    clickY > tempObject.dy - 10 &&
                    clickY < tempObject.dy + 10)
            );
        }
        default:
            return false;
    }
};
