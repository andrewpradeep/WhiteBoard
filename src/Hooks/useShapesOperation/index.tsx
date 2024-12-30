import { IBoardObject, IBoardShapes, ICircleObject, ILineObject, IRectObject, IScribbleObject } from "../../Contracts/WhiteBoard";

export interface IShapesOperationHookProps {
    canvasContext: CanvasRenderingContext2D | undefined | null
}
const useShapesOperation = (props:IShapesOperationHookProps)=>{
    const {canvasContext} = props

 const drawShapes = (
        boardObject: IBoardObject,
    ) => {
        switch (boardObject.type) {
            case IBoardShapes.RECT:
                drawRect(boardObject as IRectObject);
                break;
            case IBoardShapes.CIRCLE:
                drawCircle(boardObject as ICircleObject);
                break;
            case IBoardShapes.LINE:
                drawLine(boardObject as ILineObject);
                break;
            case IBoardShapes.SCRIBBLE:
                drawScribble(boardObject as IScribbleObject);
                break;
            default:
                return;
        }
    };

const drawRect = (
    boardObject: IRectObject,
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
    boardObject: ICircleObject,
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
    boardObject: ILineObject,
) => {
    canvasContext?.moveTo(boardObject.x, boardObject.y);
    canvasContext?.lineTo(boardObject.x + boardObject.dx,boardObject.y + boardObject.dy);
    canvasContext?.stroke();
};

const drawScribble = (
    boardObject: IScribbleObject,
) => {
    canvasContext?.moveTo(boardObject.x, boardObject.y);
    boardObject.path.forEach((IPlotPoint)=>{
        canvasContext?.lineTo(IPlotPoint.x, IPlotPoint.y);
    });
    canvasContext?.stroke();
}





return {  
    drawShapes,
}
    
}

export default useShapesOperation;