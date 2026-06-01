import React, { useEffect, useRef, useState } from "react";
import { IWhiteBoardProps } from "./interface";
import "./index.css";
import {
    IBoardMode,
    IBoardObject,

} from "../../Contracts/WhiteBoard";
import { useSelector } from "react-redux";
import { RootState } from "../../rootReducer";
import { clearCanvas, downloadCanvasAsImage, drawBackGround } from "../../Utils/WhiteBoard";
import useShapesOperation from "../../Hooks/useShapesOperation";
import useCanvasEventHandler from "../../Hooks/useCanvasEventHandler";

const WhiteBoard: React.FC<IWhiteBoardProps> = ({
    width,
    height,
    className = "",
}) => {
    const { boardObjectList, boardMode, selectedBoardObject,isDraggingInCanvas } = useSelector(
        (state: RootState) => {
            return {
                boardMode: state.WhiteBoardStore.boardMode,
                boardObjectList:
                    state.WhiteBoardStore.currentBoard?.ObjectList || [],
                selectedShape: state.WhiteBoardStore.selectedShape,
                selectedBoardObject: state.WhiteBoardStore.selectedBoardObject,
                isDraggingInCanvas : state.WhiteBoardStore.isDraggingInCanvas
            };
        }
    );
    const [canvasContext, setCanvasContext] = useState<
        CanvasRenderingContext2D | undefined | null
    >();

    const canvasRef = useRef<HTMLCanvasElement>(null);


    const { drawShapes, drawSelection } = useShapesOperation({ canvasContext });
    const { handleMouseDown, handleMouseMove, handleMouseUp } = useCanvasEventHandler()

    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        setCanvasContext(context);
        document.addEventListener("downloadCanvas",downloadCanvas)

        return ()=>{
            document.removeEventListener('downloadCanvas',downloadCanvas);
        }
    }, []);

    useEffect(() => {
        if (canvasContext) {
            window.requestAnimationFrame(drawObjects);
        }
    }, [canvasContext, boardObjectList,selectedBoardObject,isDraggingInCanvas]);


    const drawObjects = () => {
        if (canvasContext) {

            clearCanvas(canvasContext, canvasRef.current);
            drawBackGround(canvasContext as CanvasRenderingContext2D, canvasRef.current);

            if (boardObjectList.length && canvasContext) {
                boardObjectList.forEach((boardObject: IBoardObject) => {
                    canvasContext?.beginPath();
                    canvasContext.strokeStyle = "#000";
                    canvasContext.lineWidth = 1.5;
                    canvasContext.stroke
                    drawShapes(boardObject);
                    canvasContext?.closePath();
                });
            }

            if (selectedBoardObject) {
                drawSelection(selectedBoardObject);

            }

        }
    };

    const downloadCanvas = ()=>{
        canvasRef.current &&  downloadCanvasAsImage(canvasRef.current as HTMLCanvasElement)
    }

    return (
        <>
            <canvas
                width={width}
                height={height}
                className={`white-board-canvas ${boardMode !== IBoardMode.SELECTION
                    ? "click-pointer touch-off"
                    : ""
                    } ${className} ${selectedBoardObject ? "touch-off" : ""}`}
                id={"white_board"}
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
