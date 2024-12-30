import {
    IBoardObject,
    IBoardShapes,
    ICircleObject,
    ILineObject,
    IPlotPoint,
    IRectObject,
} from "../../Contracts/WhiteBoard";





export const drawBackGround = (canvasContext:CanvasRenderingContext2D | undefined | null,canvasRef:HTMLCanvasElement | null) => {
    for (
        let i = 0;
        i <= (canvasRef?.width as number);
        i = i + 100
    ) {
        for (
            let j = 0;
            j <= (canvasRef?.height as number);
            j = j + 100
        ) {
            if (canvasContext) {
                canvasContext?.beginPath();
                canvasContext.strokeStyle = "rgba(0,0,0,0.1)";
                canvasContext?.strokeRect(i, j, 100, 100);
                canvasContext?.closePath();
            }
        }
    }
};
export const clearCanvas = (canvasContext:CanvasRenderingContext2D | undefined | null,canvasRef:HTMLCanvasElement | null) => {
    canvasContext?.clearRect(
        0,
        0,
        canvasRef?.width as number,
        canvasRef?.height as number
    );
};


export const getDistanceOfPoints = (point1: IPlotPoint, point2: IPlotPoint) => {
    return Math.sqrt(
        Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
    );
};


export const isBoardObjectSelected = (
    boardObject: IBoardObject,
    clickX: number,
    clickY: number
) => {
    switch (boardObject.type) {
        case IBoardShapes.RECT: {
            // eslint-disable-next-line no-case-declarations
            const tempObject = boardObject as IRectObject;
            return (
                clickX > tempObject.x &&
                clickX < tempObject.x + tempObject.width &&
                clickY > tempObject.y &&
                clickY < tempObject.y + tempObject.height
            );
        }
        case IBoardShapes.CIRCLE: {
            // eslint-disable-next-line no-case-declarations
            const tempObject = boardObject as ICircleObject;
            return (
                clickX > tempObject.x - tempObject.radius &&
                clickX < tempObject.x + tempObject.radius &&
                clickY > tempObject.y - tempObject.radius &&
                clickY < tempObject.y + tempObject.radius
            );
        }
        case IBoardShapes.LINE: {
            const tempObject = boardObject as ILineObject;
            const {x,y} = tempObject;
            const dx = x + tempObject.dx;
            const dy = y+tempObject.dy


            return Math.round((clickX - x)/(dx - x)) === Math.round((clickY - y)/(dy-y)); 
        }
        default:
            return false;
    }
};



