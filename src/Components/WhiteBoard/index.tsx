import React, { MouseEventHandler, useEffect, useRef, useState } from "react";
import { SelectedObjectDetail, WhiteBoardProps } from "./interface";
import "./index.css";
import {
    BoardMode,
    BoardObject,
    BoardObjectDefaultprops,
    BoardShapes,
    CircleObject,
    LineObject,
    SquareObject,
} from "../../Contracts/WhiteBoard";
import { useSelector } from "react-redux";
import { RootState } from "../../rootReducer";
import {
    addWhiteBoardObjectAction,
    resetSelectedShapeAction,
    setBoardMode,
    setWhiteBoardAction,
} from "../../Store/WhiteBoardStore";
import { useDispatch } from "react-redux";
import { drawShapes, getDistanceOfPoints } from "../../Utils/WhiteBoard";

const WhiteBoard: React.FC<WhiteBoardProps> = ({
    width,
    height,
    className = "",
}) => {
    const dispatch = useDispatch();
    const { boardObjectList, selectedShape, boardMode } = useSelector(
        (state: RootState) => {
            return {
                boardMode: state.WhiteBoardStore.boardMode,
                boardObjectList:
                    state.WhiteBoardStore.currentBoard?.ObjectList || [],
                selectedShape: state.WhiteBoardStore.selectedShape,
            };
        }
    );
    const [canvasContext, setCanvasContext] = useState<
        CanvasRenderingContext2D | undefined | null
    >();

    const [selObjectDetail, setSelObjectDetail] =
        useState<SelectedObjectDetail | null>();
    const [isDraggingLine, setIsDraggingLine] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        setCanvasContext(context);
    }, []);

    useEffect(() => {
        if (canvasContext) {
            drawObjects();
        }
    }, [canvasContext, boardObjectList]);

    const drawBackGround = () => {
        for (
            let i = 0;
            i <= (canvasRef.current?.width as number);
            i = i + 100
        ) {
            for (
                let j = 0;
                j <= (canvasRef.current?.height as number);
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
    const clearCanvas = () => {
        canvasContext?.clearRect(
            0,
            0,
            canvasRef.current?.width as number,
            canvasRef.current?.height as number
        );
    };

    const drawObjects = () => {
        clearCanvas();
        drawBackGround();

        if (boardObjectList.length && canvasContext) {
            boardObjectList.forEach((boardObject: BoardObject) => {
                canvasContext?.beginPath();
                canvasContext.strokeStyle = "#000";
                drawShapes(boardObject, canvasContext);
                canvasContext?.closePath();
            });
        }
    };

    const getSelectedObject = (clickX: number, clickY: number) => {
        for (let i = 0; i < boardObjectList.length; i++) {
            const boardObject = boardObjectList[i];
            if (isObjectSelected(boardObject, clickX, clickY)) {
                return i;
            }
        }
        return null;
    };

    const isObjectSelected = (
        boardObject: BoardObject,
        clickX: number,
        clickY: number
    ) => {
        switch (boardObject.type) {
            case BoardShapes.SQUARE: {
                // eslint-disable-next-line no-case-declarations
                const tempObject = boardObject as SquareObject;
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

    const addShapesToCanvas: MouseEventHandler<HTMLCanvasElement> = (event) => {
        if (selectedShape !== null) {
            const newObject: BoardObjectDefaultprops = {
                x: event.nativeEvent.offsetX,
                y: event.nativeEvent.offsetY,
                type: selectedShape,
            };
            let tempBoardObject = null;

            switch (selectedShape) {
                case BoardShapes.SQUARE:
                    tempBoardObject = {
                        width: 60,
                        height: 60,
                        ...newObject,
                    };
                    break;
                case BoardShapes.CIRCLE:
                    tempBoardObject = { radius: 30, ...newObject };
                    break;
                default:
                    return;
            }

            dispatch(addWhiteBoardObjectAction(tempBoardObject));
            dispatch(resetSelectedShapeAction());
        }
    };

    const addLineToCanvas: MouseEventHandler<HTMLCanvasElement> = (event) => {
        setIsDraggingLine(true);
        const newObject: LineObject = {
            x: event.nativeEvent.offsetX,
            y: event.nativeEvent.offsetY,
            type: BoardShapes.LINE,
            dx: event.nativeEvent.offsetX,
            dy: event.nativeEvent.offsetY,
        };
        dispatch(addWhiteBoardObjectAction(newObject));
    };

    const handleMouseDown: MouseEventHandler<HTMLCanvasElement> = (event) => {
        if (boardMode === BoardMode.ADD_SHAPE) {
            addShapesToCanvas(event);
            return;
        } else if (boardMode === BoardMode.ADD_LINE) {
            addLineToCanvas(event);
            return;
        }

        const position = getSelectedObject(
            event.nativeEvent.offsetX,
            event.nativeEvent.offsetY
        );
        if (position !== null) {
            const boardObject = structuredClone(boardObjectList[position]);
            setSelObjectDetail({
                position,
                lastX: event.nativeEvent.offsetX - boardObject.x,
                lastY: event.nativeEvent.offsetY - boardObject.y,
            });

            if (boardObject.type === BoardShapes.LINE) {
                const tempObject = boardObject as LineObject;
                tempObject.draggingFromDestination =
                    getDistanceOfPoints(
                        { x: tempObject.x, y: tempObject.y },
                        {
                            x: event.nativeEvent.offsetX,
                            y: event.nativeEvent.offsetY,
                        }
                    ) >
                    getDistanceOfPoints(
                        { x: tempObject.dx, y: tempObject.dy },
                        {
                            x: event.nativeEvent.offsetX,
                            y: event.nativeEvent.offsetY,
                        }
                    );

                const boardList = [...boardObjectList];
                boardList[position] = tempObject;
                dispatch(setWhiteBoardAction(boardList));
            }
        }
    };

    const handleMouseMove: MouseEventHandler<HTMLCanvasElement> = (event) => {
        const boardList = [...boardObjectList];
        if (boardMode === BoardMode.ADD_LINE && isDraggingLine) {
            const lastObject = structuredClone(boardList.pop()) as LineObject;
            lastObject.dx = event.nativeEvent.offsetX;
            lastObject.dy = event.nativeEvent.offsetY;
            boardList.push(lastObject);
        } else if (selObjectDetail) {
            const boardObject = structuredClone(
                boardObjectList[selObjectDetail.position]
            );

            if (
                boardObject.type === BoardShapes.LINE &&
                (boardObject as LineObject).draggingFromDestination
            ) {
                const tempObject = boardObject as LineObject;

                tempObject.dx = event.nativeEvent.offsetX;
                tempObject.dy = event.nativeEvent.offsetY;

                boardList[selObjectDetail.position] = tempObject;
            } else {
                boardObject.x =
                    event.nativeEvent.offsetX - selObjectDetail.lastX;
                boardObject.y =
                    event.nativeEvent.offsetY - selObjectDetail.lastY;
                boardList[selObjectDetail.position] = boardObject;
            }
        }

        dispatch(setWhiteBoardAction(boardList));
    };

    const handleMouseUp: MouseEventHandler<HTMLCanvasElement> = () => {
        if (boardMode === BoardMode.ADD_LINE) {
            dispatch(setBoardMode(BoardMode.SELECTION));
            setIsDraggingLine(false);
        }
        setSelObjectDetail(null);
    };

    return (
        <>
            <canvas
                width={width}
                height={height}
                className={`${
                    boardMode !== BoardMode.SELECTION ? "click-pointer" : ""
                } ${className}`}
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            ></canvas>
        </>
    );
};

export default WhiteBoard;
