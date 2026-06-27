import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IWhiteBoardProps } from "./interface";
import "./index.css";
import { IBoardMode } from "../../Contracts/WhiteBoard";
import { RootState } from "../../rootReducer";
import { downloadBoardAsPng } from "../../Utils/WhiteBoard";
import useCanvasEventHandler from "../../Hooks/useCanvasEventHandler";
import { deleteSelectedObjectAction, getActiveBoard, setCanvasPixelSize } from "../../Store/WhiteBoardStore";
import { renderBoardFrame } from "../../Engine/CanvasEngine";

const WhiteBoard = ({ width, height, className = "" }: IWhiteBoardProps) => {
    const dispatch = useDispatch();
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        activeBoard,
        boardObjectList,
        boardMode,
        selectedBoardObject,
        isDraggingInCanvas,
        isPanningViewport,
        exportRequest,
        viewport,
        showElementNames,
    } = useSelector((state: RootState) => {
        const activeBoard = getActiveBoard(state.WhiteBoardStore);
        return {
            boardMode: state.WhiteBoardStore.boardMode,
            activeBoard,
            boardObjectList: activeBoard?.ObjectList || [],
            selectedBoardObject: state.WhiteBoardStore.selectedBoardObject,
            isDraggingInCanvas: state.WhiteBoardStore.isDraggingInCanvas,
            isPanningViewport: state.WhiteBoardStore.isPanningViewport,
            exportRequest: state.WhiteBoardStore.exportRequest,
            viewport: state.WhiteBoardStore.viewport,
            showElementNames: state.WhiteBoardStore.showElementNames,
        };
    });
    const [canvasContext, setCanvasContext] = useState<CanvasRenderingContext2D | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { handlePointerDown, handlePointerMove, handlePointerUp, handleDoubleClick, handleWheel, isSpacePressed } =
        useCanvasEventHandler();

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) {
            return;
        }

        const resizeCanvas = () => {
            const bounds = container.getBoundingClientRect();
            const pixelRatio = window.devicePixelRatio || 1;
            const nextWidth = Math.max(1, Math.round(bounds.width * pixelRatio));
            const nextHeight = Math.max(1, Math.round(bounds.height * pixelRatio));

            if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
                canvas.width = nextWidth;
                canvas.height = nextHeight;
                setCanvasSize({ width: nextWidth, height: nextHeight });
                dispatch(setCanvasPixelSize({ width: nextWidth, height: nextHeight }));
                setCanvasContext(canvas.getContext("2d"));
            }
        };

        resizeCanvas();
        const observer = new ResizeObserver(resizeCanvas);
        observer.observe(container);

        return () => observer.disconnect();
    }, [dispatch]);

    useEffect(() => {
        if (!import.meta.env.DEV) {
            return;
        }

        (window as Window & {
            __WHITEBOARD_TEST__?: {
                objectCount: number;
                boardMode?: string;
                selectedObjectId?: string | null;
                showElementNames?: boolean;
                viewport?: { offsetX: number; offsetY: number; scale?: number };
                objects?: Array<{
                    id: string;
                    displayName?: string;
                    x: number;
                    y: number;
                    width?: number;
                    height?: number;
                    radius?: number;
                    dx?: number;
                    dy?: number;
                    type: string;
                    text?: string;
                    parentId?: string;
                    childIds?: string[];
                    curveBend?: number;
                    fromAttachment?: { objectId: string; side: string };
                    toAttachment?: { objectId: string; side: string };
                }>;
            };
        }).__WHITEBOARD_TEST__ = {
            objectCount: boardObjectList.length,
            boardMode,
            selectedObjectId: selectedBoardObject?.id ?? null,
            showElementNames,
            viewport: {
                offsetX: viewport.offsetX,
                offsetY: viewport.offsetY,
                scale: viewport.scale,
            },
            objects: boardObjectList.map((obj) => ({
                id: obj.id,
                displayName: obj.displayName,
                x: obj.x,
                y: obj.y,
                width: "width" in obj ? obj.width : undefined,
                height: "height" in obj ? obj.height : undefined,
                radius: "radius" in obj ? obj.radius : undefined,
                dx: "dx" in obj ? obj.dx : undefined,
                dy: "dy" in obj ? obj.dy : undefined,
                type: obj.type,
                text: obj.text,
                parentId: obj.parentId,
                childIds: "childIds" in obj ? obj.childIds : undefined,
                curveBend: "curveBend" in obj ? obj.curveBend : undefined,
                fromAttachment: "fromAttachment" in obj ? obj.fromAttachment : undefined,
                toAttachment: "toAttachment" in obj ? obj.toAttachment : undefined,
            })),
        };
    }, [boardMode, boardObjectList, selectedBoardObject?.id, showElementNames, viewport.offsetX, viewport.offsetY, viewport.scale]);

    const drawObjects = useCallback(() => {
        if (canvasContext && canvasRef.current) {
            const showConnectionAnchors =
                boardMode === IBoardMode.ADD_LINE ||
                boardMode === IBoardMode.ADD_CONNECTOR;

            renderBoardFrame({
                canvasContext,
                canvasRef: canvasRef.current,
                objects: boardObjectList,
                selectedObject: selectedBoardObject,
                viewport,
                showConnectionAnchors,
                showElementNames,
            });
        }
    }, [boardMode, boardObjectList, canvasContext, selectedBoardObject, showElementNames, viewport]);

    useEffect(() => {
        if (canvasContext) {
            window.requestAnimationFrame(drawObjects);
        }
    }, [canvasContext, canvasSize, drawObjects, isDraggingInCanvas]);

    useEffect(() => {
        if (exportRequest.id > 0 && activeBoard) {
            downloadBoardAsPng({
                objects: activeBoard.ObjectList,
                width,
                height,
                fileName: activeBoard.name,
            });
        }
    }, [activeBoard, exportRequest, height, width]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!selectedBoardObject || (event.key !== "Delete" && event.key !== "Backspace")) {
                return;
            }

            const target = event.target as HTMLElement | null;
            const isEditingText =
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
        <div className="white-board-shell" ref={containerRef}>
            <canvas
                className={`white-board-canvas ${
                    boardMode !== IBoardMode.SELECTION ? "click-pointer touch-off" : ""
                } ${isSpacePressed || isPanningViewport ? "pan-mode" : ""} ${className} ${selectedBoardObject ? "touch-off" : ""}`}
                data-testid="canvas"
                id="white_board"
                ref={canvasRef}
                tabIndex={0}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerCancel={handlePointerUp}
                onPointerUp={handlePointerUp}
                onDoubleClick={handleDoubleClick}
                onWheel={handleWheel}
            />
        </div>
    );
};

export default WhiteBoard;
