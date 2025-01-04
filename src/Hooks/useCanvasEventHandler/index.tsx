import { MouseEventHandler } from "react";
import { useDispatch } from "react-redux";
import { IBoardMode, IBoardObject, IBoardObjectDefaultprops, IBoardShapes, ILineObject, ILineVectorPoints, IScribbleObject, ITextBoxObject } from "../../Contracts/WhiteBoard";
import { useSelector } from "react-redux";
import { addWhiteBoardObjectAction, clearSelectedBoardObjectAction, resetBoardMode, resetSelectedShapeAction, setBoardMode, setIsDraggingInCanvas, setSelectedBoardObjectAction, setWhiteBoardAction } from "../../Store/WhiteBoardStore";
import { getDistanceOfPoints, isBoardObjectSelected } from "../../Utils/WhiteBoard";
import { RootState } from "../../rootReducer";


const useCanvasEventHandler = ()=>{

    const dispatch = useDispatch();
    

    const { boardObjectList, selectedShape, boardMode, selectedBoardObject,isDragging } = useSelector(
        (state: RootState) => {
            return {
                boardMode: state.WhiteBoardStore.boardMode,
                boardObjectList:
                    state.WhiteBoardStore.currentBoard?.ObjectList || [],
                selectedShape: state.WhiteBoardStore.selectedShape,
                selectedBoardObject: state.WhiteBoardStore.selectedBoardObject,
                isDragging: state.WhiteBoardStore.isDraggingInCanvas
            };
        }
    );


    const addShapesToCanvas = (pageX: number, pageY: number) => {
        if (selectedShape !== null) {
            const newObject: IBoardObjectDefaultprops = {
                x: pageX,
                y: pageY,
                type: selectedShape,
            };
            let tempBoardObject:IBoardObject | null = null;

            switch (selectedShape) {
                case IBoardShapes.RECT:
                    tempBoardObject = {
                        width: 60,
                        height: 60,
                        ...newObject,
                    };
                    break;
                case IBoardShapes.CIRCLE:
                    tempBoardObject = { radius: 30, ...newObject };
                    break;
                default:
                    return;
            }

            dispatch(addWhiteBoardObjectAction(tempBoardObject as IBoardObject));
            dispatch(resetSelectedShapeAction());
        }
    };

    const addLineToCanvas = (pageX: number, pageY: number) => {
        const newObject: ILineObject = {
            x: pageX,
            y: pageY,
            type: IBoardShapes.LINE,
            dx: 0,
            dy: 0,
        };
        dispatch(addWhiteBoardObjectAction(newObject));
    };

    const addScribbleToCanvas = (pageX: number, pageY: number) => {
        const newObject:IScribbleObject  = {
            x: pageX,
            y: pageY,
            type: IBoardShapes.SCRIBBLE,
            path:[]
            
        };
        dispatch(addWhiteBoardObjectAction(newObject));
    };

    const addTextBoxToCanvas = (pageX: number, pageY: number) => {
        const newObject:ITextBoxObject = {
            x: pageX,
            y: pageY,
            type: IBoardShapes.TEXT_BOX,
            width: 150,
            height: 45,
            text: "",
            html: ""
        }
        dispatch(addWhiteBoardObjectAction(newObject));
    }

    const getSelectedObjectPosition = (clickX: number, clickY: number) => {
        for (let i = 0; i < boardObjectList.length; i++) {
            const boardObject = boardObjectList[i];
            if (isBoardObjectSelected(boardObject, clickX, clickY)) {
                return i;
            }
        }
        return null;
    };

    const handleMouseDown: MouseEventHandler<HTMLCanvasElement> = (event) => {
        dispatch(setIsDraggingInCanvas(true));
        const { pageX, pageY } = event.nativeEvent;
        if (boardMode === IBoardMode.ADD_SHAPE) {
            addShapesToCanvas(pageX, pageY);
            return;
        } else if (boardMode === IBoardMode.ADD_LINE) {
            addLineToCanvas(pageX, pageY);
            return;
        }
        else if(boardMode === IBoardMode.SCRIBBLE)
        {
            addScribbleToCanvas(pageX,pageY);
            return;
        }
        else if(boardMode === IBoardMode.ADD_TEXT_BOX)
        {
            addTextBoxToCanvas(pageX,pageY)
            return;
        }

        const position = getSelectedObjectPosition(pageX, pageY);
        if (position !== null) {
            event.preventDefault();
            const boardObject = structuredClone(boardObjectList[position]);
            dispatch(setSelectedBoardObjectAction({
                position,
                lastX: pageX - boardObject.x,
                lastY: pageY - boardObject.y,
            }));

            if (boardObject.type === IBoardShapes.LINE) {
                const tempObject = {...boardObject} as ILineObject;
                tempObject.draggingFromDestination =
                    getDistanceOfPoints(
                        { x: tempObject.x, y: tempObject.y },
                        {
                            x: pageX,
                            y: pageY,
                        }
                    ) < 10 ? ILineVectorPoints.INITIAL :   
                    getDistanceOfPoints(
                        { x: tempObject.x + tempObject.dx, y: tempObject.y + tempObject.dy },
                        {
                            x: pageX,
                            y: pageY,
                        }
                    ) < 10 ?  ILineVectorPoints.TERMINAL : undefined;

                const boardList = [...boardObjectList];
                boardList[position] = tempObject;
                dispatch(setWhiteBoardAction(boardList));
            }
        }
        else 
        {
            dispatch(clearSelectedBoardObjectAction());
        }
    };

    const handleMouseMove: MouseEventHandler<HTMLCanvasElement> = (event) => {
        event.preventDefault();
        handleMove(event.nativeEvent.pageX, event.nativeEvent.pageY);
    };

    const handleMove = (pageX: number, pageY: number) => {
        if(isDragging)
        {
            const boardList = [...boardObjectList];
        if (boardMode === IBoardMode.ADD_LINE) {
            const lastObject = structuredClone(boardList.pop()) as ILineObject;
            lastObject.dx =  pageX - lastObject.x ;
            lastObject.dy =  pageY - lastObject.y;
            boardList.push(lastObject);
        }
        else if(boardMode=== IBoardMode.SCRIBBLE)
        {
            const lastObject = structuredClone(boardList.pop()) as IScribbleObject;
            lastObject.path.push({x:pageX,y:pageY});
            boardList.push(lastObject);
        }
         else if (selectedBoardObject) {
            const boardObject = structuredClone(
                boardObjectList[selectedBoardObject.position]
            );

            if (
                boardObject.type === IBoardShapes.LINE  && !!(boardObject as ILineObject).draggingFromDestination
            ) {
                const tempObject = boardObject as ILineObject;

                if((boardObject as ILineObject).draggingFromDestination === ILineVectorPoints.TERMINAL)
                {
                    tempObject.dx = pageX - tempObject.x;
                    tempObject.dy = pageY - tempObject.y;
                }
                else if((boardObject as ILineObject).draggingFromDestination === ILineVectorPoints.INITIAL)
                {
                    tempObject.dx = (tempObject.x - pageX) + tempObject.dx;
                    tempObject.dy = (tempObject.y - pageY) + tempObject.dy;
                    tempObject.x = pageX;
                    tempObject.y = pageY;
                }

                boardList[selectedBoardObject.position] = tempObject;
            } else {
                boardObject.x = pageX - selectedBoardObject.lastX;
                boardObject.y = pageY - selectedBoardObject.lastY;
                boardList[selectedBoardObject.position] = boardObject;
            }
        }

        dispatch(setWhiteBoardAction(boardList));
        }
        
    };

    const handleMouseUp = () => {
        dispatch(setIsDraggingInCanvas(false));
        if (boardMode === IBoardMode.ADD_LINE) {
            dispatch(setBoardMode(IBoardMode.SELECTION));
        }
        else if(boardMode === IBoardMode.ADD_TEXT_BOX)
        {
            const lastData = boardObjectList.at(-1) as ITextBoxObject
            dispatch(setSelectedBoardObjectAction({
                position: boardObjectList.length -1,
                lastX: (lastData.width/2),
                lastY: (lastData.height/2),
            }));
            dispatch(resetBoardMode());
            return;
            }
    };

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
    }
    
}


export default useCanvasEventHandler;