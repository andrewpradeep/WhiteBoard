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
            window.requestAnimationFrame(drawObjects);
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

    const addShapesToCanvas = (pageX: number, pageY: number) => {
        if (selectedShape !== null) {
            const newObject: BoardObjectDefaultprops = {
                x: pageX,
                y: pageY,
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

    const addLineToCanvas = (pageX: number, pageY: number) => {
        setIsDraggingLine(true);
        const newObject: LineObject = {
            x: pageX,
            y: pageY,
            type: BoardShapes.LINE,
            dx: pageX,
            dy: pageY,
        };
        dispatch(addWhiteBoardObjectAction(newObject));
    };

    const handleMouseDown: MouseEventHandler<HTMLCanvasElement> = (event) => {
        const { pageX, pageY } = event.nativeEvent;
        if (boardMode === BoardMode.ADD_SHAPE) {
            addShapesToCanvas(pageX, pageY);
            return;
        } else if (boardMode === BoardMode.ADD_LINE) {
            addLineToCanvas(pageX, pageY);
            return;
        }

        const position = getSelectedObject(pageX, pageY);
        if (position !== null) {
            event.preventDefault();
            const boardObject = structuredClone(boardObjectList[position]);
            setSelObjectDetail({
                position,
                lastX: pageX - boardObject.x,
                lastY: pageY - boardObject.y,
            });

            if (boardObject.type === BoardShapes.LINE) {
                const tempObject = boardObject as LineObject;
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
        if (boardMode === BoardMode.ADD_LINE && isDraggingLine) {
            const lastObject = structuredClone(boardList.pop()) as LineObject;
            lastObject.dx = pageX;
            lastObject.dy = pageY;
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

                tempObject.dx = pageX;
                tempObject.dy = pageY;

                boardList[selObjectDetail.position] = tempObject;
            } else {
                boardObject.x = pageX - selObjectDetail.lastX;
                boardObject.y = pageY - selObjectDetail.lastY;
                boardList[selObjectDetail.position] = boardObject;
            }
        }

        dispatch(setWhiteBoardAction(boardList));
    };

    const handleMouseUp = () => {
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
                className={`white-board-canvas ${
                    boardMode !== BoardMode.SELECTION
                        ? "click-pointer touch-off"
                        : ""
                } ${className} ${selObjectDetail ? "touch-off" : ""}`}
                ref={canvasRef}
                onPointerDown={handleMouseDown}
                onPointerMove={handleMouseMove}
                onPointerCancel={handleMouseUp}
                onPointerUp={handleMouseUp}
            ></canvas>
        </>
    );
};

export default WhiteBoard;
