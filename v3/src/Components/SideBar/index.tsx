import Icon from "../Icon";
import "./index.css";
import SquareIcon from "../../assets/utility/shapes.svg";
import LineIcon from "../../assets/utility/line.svg";
import ArrowIcon from "../../assets/utility/arrow.svg";
import PenIcon from "../../assets/utility/pen.svg";
import downloadIcon from "../../assets/utility/download.svg";
import cursorPointerIcon from "../../assets/utility/cursor-pointer.svg";
import textBoxIcon from "../../assets/utility/Textbox.svg";
import { useState } from "react";
import { IBoardMode, IBoardShapes } from "../../Contracts/WhiteBoard";
import { exportRequested, toolSelected } from "../../Store/WhiteBoardStore";
import { useDispatch, useSelector } from "react-redux";
import ShapeList from "./Organisms/ShapeList";
import { RootState } from "../../rootReducer";

const SideBar = () => {
    const dispatch = useDispatch();
    const [isShapeListVisible, setShapeListVisible] = useState(false);
    const { boardMode, selectedShape } = useSelector((state: RootState) => ({
        boardMode: state.WhiteBoardStore.boardMode,
        selectedShape: state.WhiteBoardStore.selectedShape,
    }));

    const selectTool = (payload: { mode: IBoardMode; shape?: IBoardShapes }) => {
        setShapeListVisible(false);
        dispatch(toolSelected(payload));
    };

    const handleShapesClick = () => {
        setShapeListVisible((visible) => !visible);
    };

    const handleShapePick = (shape: IBoardShapes) => {
        dispatch(toolSelected({ mode: IBoardMode.ADD_SHAPE, shape }));
    };

    const tools = [
        {
            label: "Select",
            mode: IBoardMode.SELECTION,
            icon: cursorPointerIcon,
            onClick: () => selectTool({ mode: IBoardMode.SELECTION }),
        },
        {
            label: "Shapes",
            mode: IBoardMode.ADD_SHAPE,
            icon: SquareIcon,
            onClick: handleShapesClick,
        },
        {
            label: "Line",
            mode: IBoardMode.ADD_LINE,
            shape: IBoardShapes.LINE,
            icon: LineIcon,
            onClick: () =>
                selectTool({ mode: IBoardMode.ADD_LINE, shape: IBoardShapes.LINE }),
        },
        {
            label: "Arrow",
            mode: IBoardMode.ADD_LINE,
            shape: IBoardShapes.ARROW,
            icon: ArrowIcon,
            onClick: () =>
                selectTool({ mode: IBoardMode.ADD_LINE, shape: IBoardShapes.ARROW }),
        },
        {
            label: "Draw",
            mode: IBoardMode.SCRIBBLE,
            icon: PenIcon,
            onClick: () => selectTool({ mode: IBoardMode.SCRIBBLE }),
        },
        {
            label: "Text",
            mode: IBoardMode.ADD_TEXT_BOX,
            icon: textBoxIcon,
            onClick: () => selectTool({ mode: IBoardMode.ADD_TEXT_BOX }),
        },
        {
            label: "Erase",
            mode: IBoardMode.ERASER,
            icon: null,
            onClick: () => selectTool({ mode: IBoardMode.ERASER }),
        },
    ];

    const isToolSelected = (tool: (typeof tools)[number]) => {
        if (tool.mode === IBoardMode.ADD_SHAPE) {
            return boardMode === IBoardMode.ADD_SHAPE;
        }

        if ("shape" in tool && tool.shape) {
            if (boardMode === IBoardMode.ADD_CONNECTOR) {
                return tool.shape === selectedShape;
            }

            if (boardMode === IBoardMode.ADD_LINE) {
                return tool.shape === selectedShape;
            }
        }

        return boardMode === tool.mode;
    };

    const renderToolButton = (tool: (typeof tools)[number]) => {
        const isShapesTool = tool.mode === IBoardMode.ADD_SHAPE;

        return (
            <div className={`tool-slot ${isShapesTool ? "tool-slot-shapes" : ""}`} key={tool.label}>
                <button
                    aria-expanded={isShapesTool ? isShapeListVisible : undefined}
                    aria-haspopup={isShapesTool ? "true" : undefined}
                    aria-label={tool.label}
                    className={`tool-button ${isToolSelected(tool) ? "selected" : ""}`}
                    data-testid={`tool-${tool.label.toLowerCase()}`}
                    onClick={tool.onClick}
                    type="button"
                >
                    {tool.icon ? (
                        <Icon srcUrl={tool.icon} className="side-bar-icon" />
                    ) : (
                        <span className="eraser-tool-icon">⌫</span>
                    )}
                </button>
                {isShapesTool && isShapeListVisible && (
                    <ShapeList
                        clickOutside={() => setShapeListVisible(false)}
                        onSelection={handleShapePick}
                    />
                )}
            </div>
        );
    };

    return (
        <div
            className="side-bar"
            data-testid="toolbar"
            onMouseDown={(event) => event.stopPropagation()}
        >
            <div className="tool-group">{tools.slice(0, 1).map(renderToolButton)}</div>
            <div className="tool-group">{tools.slice(1, 4).map(renderToolButton)}</div>
            <div className="tool-group">{tools.slice(4, 7).map(renderToolButton)}</div>
            <div className="tool-group">
                <button
                    aria-label="Export PNG"
                    className="tool-button"
                    data-testid="tool-export"
                    onClick={() => dispatch(exportRequested())}
                    type="button"
                >
                    <Icon srcUrl={downloadIcon} className="side-bar-icon" />
                </button>
            </div>
        </div>
    );
};

export default SideBar;
