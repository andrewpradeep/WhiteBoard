import React, {useEffect, useRef, useState } from "react";
import {  IWhiteBoardProps } from "./interface";
import "./index.css";
import {
    IBoardMode,
    IBoardObject,

} from "../../Contracts/WhiteBoard";
import { useSelector } from "react-redux";
import { RootState } from "../../rootReducer";
import { clearCanvas, drawBackGround } from "../../Utils/WhiteBoard";
import useShapesOperation from "../../Hooks/useShapesOperation";
import useCanvasEventHandler from "../../Hooks/useCanvasEventHandler";

const WhiteBoard: React.FC<IWhiteBoardProps> = ({
    width,
    height,
    className = "",
}) => {
    const { boardObjectList, boardMode,selectedBoardObject } = useSelector(
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
    const [canvasContext, setCanvasContext] = useState<
        CanvasRenderingContext2D | undefined | null
    >();

    const canvasRef = useRef<HTMLCanvasElement>(null);


    const { drawShapes } = useShapesOperation({ canvasContext });
    const { handleMouseDown, handleMouseMove, handleMouseUp } = useCanvasEventHandler()

    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        setCanvasContext(context);
    }, []);

    useEffect(() => {
        if (canvasContext) {
            window.requestAnimationFrame(drawObjects);
        }
    }, [canvasContext, boardObjectList]);


    const drawObjects = () => {
        clearCanvas(canvasContext, canvasRef.current);
        drawBackGround(canvasContext, canvasRef.current);

        if (boardObjectList.length && canvasContext) {
            boardObjectList.forEach((boardObject: IBoardObject) => {
                canvasContext?.beginPath();
                canvasContext.strokeStyle = "#000";
                drawShapes(boardObject);
                canvasContext?.closePath();
            });
        }
    };


    return (
        <>
            <canvas
                width={width}
                height={height}
                className={`white-board-canvas ${boardMode !== IBoardMode.SELECTION
                        ? "click-pointer touch-off"
                        : ""
                    } ${className} ${selectedBoardObject ? "touch-off" : ""}`}
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
