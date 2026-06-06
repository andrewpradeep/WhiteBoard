import React, { useCallback, useEffect, useRef, useState } from "react";
import { IWhiteBoardProps } from "./interface";
import "./index.css";
import {
    IBoardMode,

} from "../../Contracts/WhiteBoard";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { RootState } from "../../rootReducer";
import { downloadBoardAsPdf, downloadBoardAsPng, renderBoard } from "../../Utils/WhiteBoard";
import useCanvasEventHandler from "../../Hooks/useCanvasEventHandler";
import { deleteSelectedObjectAction, getActiveBoard } from "../../Store/WhiteBoardStore";

const WhiteBoard: React.FC<IWhiteBoardProps> = ({
    width,
    height,
    className = "",
}) => {
    const dispatch = useDispatch();
    const {
        activeBoard,
        boardObjectList,
        boardMode,
        selectedBoardObject,
        isDraggingInCanvas,
        exportRequest,
    } = useSelector(
        (state: RootState) => {
            const activeBoard = getActiveBoard(state.WhiteBoardStore);
            return {
                boardMode: state.WhiteBoardStore.boardMode,
                activeBoard,
                boardObjectList: activeBoard?.ObjectList || [],
                selectedBoardObject: state.WhiteBoardStore.selectedBoardObject,
                isDraggingInCanvas : state.WhiteBoardStore.isDraggingInCanvas,
                exportRequest: state.WhiteBoardStore.exportRequest,
            };
        }
    );
    const [canvasContext, setCanvasContext] = useState<
        CanvasRenderingContext2D | undefined | null
    >();

    const canvasRef = useRef<HTMLCanvasElement>(null);


    const { handlePointerDown, handlePointerMove, handlePointerUp } = useCanvasEventHandler()

    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        setCanvasContext(context);
    }, []);

    const drawObjects = useCallback(() => {
        if (canvasContext && canvasRef.current) {
            renderBoard({
                canvasContext,
                canvasRef: canvasRef.current,
                objects: boardObjectList,
                selectedObject: selectedBoardObject,
            });
        }
    }, [boardObjectList, canvasContext, height, selectedBoardObject, width]);

    useEffect(() => {
        if (canvasContext) {
            window.requestAnimationFrame(drawObjects);
        }
    }, [canvasContext, drawObjects, height, isDraggingInCanvas, width]);

    useEffect(() => {
        if (exportRequest.id > 0 && activeBoard) {
            const exportData = {
                objects: activeBoard.ObjectList,
                width,
                height,
                fileName: activeBoard.name,
            };

            if (exportRequest.format === "png") {
                downloadBoardAsPng(exportData);
            } else {
                downloadBoardAsPdf(exportData);
            }
        }
    }, [activeBoard, exportRequest, height, width]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!selectedBoardObject || (event.key !== "Delete" && event.key !== "Backspace")) {
                return;
            }

            const target = event.target as HTMLElement | null;
            const isEditingText =
                target?.closest(".ql-editor") ||
                target?.closest("input") ||
                target?.closest("textarea") ||
                target?.isContentEditable;

            if (isEditingText) {
                return;
            }

            event.preventDefault();
            dispatch(deleteSelectedObjectAction());
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [dispatch, selectedBoardObject]);

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
                style={{ width, height }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerCancel={handlePointerUp}
                onPointerUp={handlePointerUp}
            ></canvas>
        </>
    );
};

export default WhiteBoard;
