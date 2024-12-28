import { MouseEventHandler, useState } from "react";
import { useDispatch } from "react-redux";
import { IBoardMode, IBoardObject, IBoardObjectDefaultprops, IBoardShapes, ILineObject, IScribbleObject } from "../../Contracts/WhiteBoard";
import { useSelector } from "react-redux";
import { addWhiteBoardObjectAction, clearSelectedBoardObjectAction, resetSelectedShapeAction, setBoardMode, setSelectedBoardObjectAction, setWhiteBoardAction } from "../../Store/WhiteBoardStore";
import { getDistanceOfPoints, isBoardObjectSelected } from "../../Utils/WhiteBoard";
import { RootState } from "../../rootReducer";


const useCanvasEventHandler = ()=>{

    const dispatch = useDispatch();
    
    const [isDraggingLine, setIsDraggingLine] = useState(false);

    const { boardObjectList, selectedShape, boardMode, selectedBoardObject } = useSelector(
        (state: RootState) => {
            return {
                boardMode: state.WhiteBoardStore.boardMode,
                boardObjectList:
                    state.WhiteBoardStore.currentBoard?.ObjectList || [],
                selectedShape: state.WhiteBoardStore.selectedShape,
                selectedBoardObject: state.WhiteBoardStore.selectedBoardObject
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
        setIsDraggingLine(true);
        const newObject: ILineObject = {
            x: pageX,
            y: pageY,
            type: IBoardShapes.LINE,
            dx: pageX,
            dy: pageY,
        };
        dispatch(addWhiteBoardObjectAction(newObject));
    };

    const addScribbleToCanvas = (pageX: number, pageY: number) => {
        setIsDraggingLine(true);
        const newObject:IScribbleObject  = {
            x: pageX,
            y: pageY,
            type: IBoardShapes.SCRIBBLE,
            path:[]
            
        };
        dispatch(addWhiteBoardObjectAction(newObject));
    };

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
        }

        const position = getSelectedObjectPosition(pageX, pageY);
        if (position !== null) {
            event.preventDefault();
            const boardObject = structuredClone(boardObjectList[position]);
            dispatch(setSelectedBoardObjectAction({
                position,
                lastX: pageX - boardObject.x,
                lastY: pageY - boardObject.y,
                data: boardObject
            }));

            if (boardObject.type === IBoardShapes.LINE) {
                const tempObject = boardObject as ILineObject;
                tempObject.draggingFromDestination =
                    getDistanceOfPoints(
                        { x: tempObject.x, y: tempObject.y },
                        {
                            x: pageX,
                            y: pageY,
                        }
                    ) >
                    getDistanceOfPoints(
                        { x: tempObject.dx, y: tempObject.dy },
                        {
                            x: pageX,
                            y: pageY,
                        }
                    );

                const boardList = [...boardObjectList];
                boardList[position] = tempObject;
                dispatch(setWhiteBoardAction(boardList));
            }
        }
    };

    const handleMouseMove: MouseEventHandler<HTMLCanvasElement> = (event) => {
        event.preventDefault();
        handleMove(event.nativeEvent.pageX, event.nativeEvent.pageY);
    };

    const handleMove = (pageX: number, pageY: number) => {
        const boardList = [...boardObjectList];
        if (boardMode === IBoardMode.ADD_LINE && isDraggingLine) {
            const lastObject = structuredClone(boardList.pop()) as ILineObject;
            lastObject.dx = pageX;
            lastObject.dy = pageY;
            boardList.push(lastObject);
        }
        else if(boardMode=== IBoardMode.SCRIBBLE && isDraggingLine)
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
                boardObject.type === IBoardShapes.LINE &&
                (boardObject as ILineObject).draggingFromDestination
            ) {
                const tempObject = boardObject as ILineObject;

                tempObject.dx = pageX;
                tempObject.dy = pageY;

                boardList[selectedBoardObject.position] = tempObject;
            } else {
                boardObject.x = pageX - selectedBoardObject.lastX;
                boardObject.y = pageY - selectedBoardObject.lastY;
                boardList[selectedBoardObject.position] = boardObject;
            }
        }

        dispatch(setWhiteBoardAction(boardList));
    };

    const handleMouseUp = () => {
        if (boardMode === IBoardMode.ADD_LINE) {
            dispatch(setBoardMode(IBoardMode.SELECTION));
            setIsDraggingLine(false);
        }
        else if(boardMode === IBoardMode.SCRIBBLE)
        {
                setIsDraggingLine(false);
        }
        dispatch(clearSelectedBoardObjectAction());
    };

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
    }
    
}


export default useCanvasEventHandler;