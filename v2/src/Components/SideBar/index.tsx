import Icon from "../Icon";
import "./index.css";
import SquareIcon from "../../assets/utility/shapes.svg";
import LineIcon from "../../assets/utility/arrow.svg";
import PenIcon from "../../assets/utility/pen.svg";
// import pointerIcon from "../../assets/utility/pointer.svg";
import downloadIcon from "../../assets/utility/download.svg";
import cursorPointerIcon from "../../assets/utility/cursor-pointer.svg";
import textBoxIcon from "../../assets/utility/Textbox.svg";

import { useState } from "react";
import { IBoardMode, IBoardShapes } from "../../Contracts/WhiteBoard";
import {
    exportRequested,
    toolSelected,
} from "../../Store/WhiteBoardStore";
import { useDispatch } from "react-redux";
import ShapeList from "./Organisms/ShapeList";
import { useSelector } from "react-redux";
import { RootState } from "../../rootReducer";

const SideBar: React.FC = () => {
    const dispatch = useDispatch();
    const [isShapeListVisible, setShapeListVisible] = useState(false);
    const [isExportMenuVisible, setExportMenuVisible] = useState(false);

    const {boardMode, selectedShape} = useSelector((state:RootState)=>{
        return {
            boardMode: state.WhiteBoardStore.boardMode,
            selectedShape: state.WhiteBoardStore.selectedShape
        }
    })
    const handlePointerClick = ()=>{
        dispatch(toolSelected({ mode: IBoardMode.SELECTION }));
    }

    const handleShapeSelection = (shape: IBoardShapes) => {
        setShapeListVisible(false);
        dispatch(toolSelected({ mode: IBoardMode.ADD_SHAPE, shape }));
    };

    const handleLineClick = () => {
        dispatch(toolSelected({ mode: IBoardMode.ADD_LINE, shape: IBoardShapes.LINE }));
    };

    const handleArrowClick = () => {
        dispatch(toolSelected({ mode: IBoardMode.ADD_LINE, shape: IBoardShapes.ARROW }));
    };

    const handleScribbleClick = ()=>{
        dispatch(toolSelected({ mode: IBoardMode.SCRIBBLE }));
    }

    const handleCanvasDownload = (format: "pdf" | "png")=>{
        setExportMenuVisible(false);
        dispatch(exportRequested(format));
    }

    const handleTextBoxClick = ()=>{
        dispatch(toolSelected({ mode: IBoardMode.ADD_TEXT_BOX }));
    }

    const handleEraserClick = ()=>{
        dispatch(toolSelected({ mode: IBoardMode.ERASER }));
    }

    const tools = [
        {
            label: "Select",
            mode: IBoardMode.SELECTION,
            icon: cursorPointerIcon,
            onClick: handlePointerClick,
        },
        {
            label: "Shapes",
            mode: IBoardMode.ADD_SHAPE,
            icon: SquareIcon,
            onClick: () => setShapeListVisible(!isShapeListVisible),
        },
        {
            label: "Line",
            mode: IBoardMode.ADD_LINE,
            shape: IBoardShapes.LINE,
            icon: LineIcon,
            onClick: handleLineClick,
        },
        {
            label: "Arrow",
            mode: IBoardMode.ADD_LINE,
            shape: IBoardShapes.ARROW,
            icon: LineIcon,
            onClick: handleArrowClick,
        },
        {
            label: "Draw",
            mode: IBoardMode.SCRIBBLE,
            icon: PenIcon,
            onClick: handleScribbleClick,
        },
        {
            label: "Text",
            mode: IBoardMode.ADD_TEXT_BOX,
            icon: textBoxIcon,
            onClick: handleTextBoxClick,
        },
        {
            label: "Erase",
            mode: IBoardMode.ERASER,
            icon: null,
            onClick: handleEraserClick,
        },
    ];
    

    return (
        <>
            <div className="side-bar">
                <div className="side-bar-label">Tools</div>
                {tools.map((tool) => (
                    <button
                        className={`icon-container ${
                            boardMode === tool.mode &&
                            (!("shape" in tool) || tool.shape === selectedShape)
                                ? "selected"
                                : ""
                        }`}
                        key={tool.label}
                        onClick={tool.onClick}
                        title={tool.label}
                        type="button"
                    >
                        {tool.icon ? (
                            <Icon srcUrl={tool.icon} className="side-bar-icon" />
                        ) : (
                            <span className="eraser-tool-icon">⌫</span>
                        )}
                        <span>{tool.label}</span>
                        {tool.mode === IBoardMode.ADD_SHAPE && isShapeListVisible && (
                            <ShapeList
                                clickOutside={() => {
                                    setShapeListVisible(false);
                                }}
                                onSelection={handleShapeSelection}
                            />
                        )}
                    </button>
                ))}

                <button
                    className="icon-container export-button"
                    onClick={() => setExportMenuVisible((currentValue) => !currentValue)}
                    type="button"
                >
                    <Icon srcUrl={downloadIcon} className="side-bar-icon" />
                    <span>Export</span>
                    {isExportMenuVisible && (
                        <div className="export-menu-container">
                            <button onClick={() => handleCanvasDownload("pdf")} type="button">
                                Export as PDF
                            </button>
                            <button onClick={() => handleCanvasDownload("png")} type="button">
                                Export as PNG
                            </button>
                        </div>
                    )}
                </button>
            </div>

           
        </>
    );
};

export default SideBar;
