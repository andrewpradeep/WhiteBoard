import { IBoardObject, IBoardShapes, ICircleObject, ILineObject, IRectObject, IScribbleObject, ITextBoxObject } from "../../Contracts/WhiteBoard";
import { ISelectedObjectDetail } from "../../Store/WhiteBoardStore";

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
            case IBoardShapes.TEXT_BOX:
                drawTextBox(boardObject as ITextBoxObject);
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

const drawTextBox = ( boardObject: ITextBoxObject)=>{
    if(canvasContext)
    {
        canvasContext.fillStyle = "white";
        canvasContext.fillRect(
            boardObject.x,
            boardObject.y,
            boardObject.width,
            boardObject.height
        );
        canvasContext.font = "13px Helvetica, Arial, sans-serif";
        canvasContext.fillStyle = "#000";
        boardObject.text.split(/\r?\n/).forEach((text, index) => {
            canvasContext.fillText(text, boardObject.x + (12), boardObject.y + ((index + 1) * 13) + 15);

        });
        
        canvasContext.strokeRect(
            boardObject.x+2,
            boardObject.y+2,
            boardObject.width-4,
            boardObject.height-4
        );
    }
    
    
}


const drawSelection = (selectionObject: ISelectedObjectDetail)=>{
    // To be completed shortly
    return selectionObject;
}





return {  
    drawShapes,
    drawSelection,
}
    
}

export default useShapesOperation;