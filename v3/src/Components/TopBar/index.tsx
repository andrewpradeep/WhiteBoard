import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IBoardMode, IBoardShapes } from "../../Contracts/WhiteBoard";
import { RootState } from "../../rootReducer";
import { connectToolSelected, getActiveBoard, zoomBy, resetViewport } from "../../Store/WhiteBoardStore";
import { isConnectableShape } from "../../Utils/anchorGeometry";
import "./index.css";

const TopBar = () => {
    const dispatch = useDispatch();
    const { scale, boardMode, selectedShape, selectedBoardObject, activeBoardObjects } = useSelector(
        (state: RootState) => {
            const activeBoard = getActiveBoard(state.WhiteBoardStore);
            return {
                scale: state.WhiteBoardStore.viewport.scale,
                boardMode: state.WhiteBoardStore.boardMode,
                selectedShape: state.WhiteBoardStore.selectedShape,
                selectedBoardObject: state.WhiteBoardStore.selectedBoardObject,
                activeBoardObjects: activeBoard?.ObjectList ?? [],
            };
        }
    );
    const zoomPercent = Math.round(scale * 100);

    const selectedObject = activeBoardObjects.find((item) => item.id === selectedBoardObject?.id);
    const canConnectFromSelection = !!selectedObject && isConnectableShape(selectedObject);

    const toolHint = useMemo(() => {
        switch (boardMode) {
            case IBoardMode.ADD_SHAPE:
                return "Click canvas to place shape";
            case IBoardMode.ADD_LINE:
                return selectedShape === IBoardShapes.ARROW
                    ? "Drag from a shape anchor to connect, or draw freely on canvas"
                    : "Drag from a shape anchor to connect, or draw freely on canvas";
            case IBoardMode.ADD_CONNECTOR:
                return selectedShape === IBoardShapes.ARROW
                    ? "Drag from shape anchor to another shape to connect arrow"
                    : "Drag from shape anchor to another shape to connect line";
            case IBoardMode.SCRIBBLE:
                return "Drag on canvas to draw";
            case IBoardMode.ADD_TEXT_BOX:
                return "Click canvas to add text";
            case IBoardMode.ERASER:
                return "Click or drag to erase";
            case IBoardMode.SELECTION:
                return canConnectFromSelection
                    ? "Drag anchor dots to connect, or use Connect buttons"
                    : null;
            default:
                return null;
        }
    }, [boardMode, canConnectFromSelection, selectedShape]);

    return (
        <div className="top-bar">
            <div className="top-bar-start">
                <span className="app-title">Whiteboard</span>
                {toolHint && (
                    <span className="tool-hint" data-testid="tool-hint">
                        {toolHint}
                    </span>
                )}
                {canConnectFromSelection && boardMode === IBoardMode.SELECTION && (
                    <div aria-label="Connect shape" className="connect-actions" role="group">
                        <button
                            data-testid="connect-line"
                            onClick={() => dispatch(connectToolSelected(IBoardShapes.LINE))}
                            type="button"
                        >
                            Connect line
                        </button>
                        <button
                            data-testid="connect-arrow"
                            onClick={() => dispatch(connectToolSelected(IBoardShapes.ARROW))}
                            type="button"
                        >
                            Connect arrow
                        </button>
                    </div>
                )}
            </div>
            <div aria-label="Zoom" className="zoom-controls" role="group">
                <button
                    aria-label="Zoom out"
                    data-tooltip="Zoom out"
                    onClick={() => dispatch(zoomBy(-0.1))}
                    type="button"
                >
                    −
                </button>
                <span aria-live="polite" className="zoom-label" data-testid="zoom-label">
                    {zoomPercent}%
                </span>
                <button
                    aria-label="Zoom in"
                    data-tooltip="Zoom in"
                    onClick={() => dispatch(zoomBy(0.1))}
                    type="button"
                >
                    +
                </button>
                <button
                    aria-label="Reset zoom"
                    data-tooltip="Reset zoom"
                    onClick={() => dispatch(resetViewport())}
                    type="button"
                >
                    Fit
                </button>
            </div>
        </div>
    );
};

export default TopBar;
