import Icon from "../Icon";
import "./index.css";
import SquareIcon from "../../assets/utility/shapes.svg";
import LineIcon from "../../assets/utility/arrow.svg";
import PenIcon from "../../assets/utility/pen.svg";
import pointerIcon from "../../assets/utility/pointer.svg";

import { useState } from "react";
import { BoardMode, BoardShapes } from "../../Contracts/WhiteBoard";
import {
    setBoardMode,
    setSelectedShapeAction,
} from "../../Store/WhiteBoardStore";
import { useDispatch } from "react-redux";
import ShapeList from "./Organisms/ShapeList";

const SideBar: React.FC = () => {
    const dispatch = useDispatch();
    const [isShapeListVisible, setShapeListVisible] = useState(false);
    const handlePointerClick = ()=>{
        dispatch(setBoardMode(BoardMode.SELECTION));
    }

    const handleShapeSelection = (shape: BoardShapes) => {
        setShapeListVisible(false);
        dispatch(setSelectedShapeAction(shape));
    };

    const handleLineClick = () => {
        dispatch(setBoardMode(BoardMode.ADD_LINE));
    };

    const handleScribbleClick = ()=>{
        dispatch(setBoardMode(BoardMode.SCRIBBLE));
    }

    return (
        <>
            <div className="side-bar">
                <span className="icon-container" onClick={handlePointerClick}>
                    <Icon srcUrl={pointerIcon} className="side-bar-icon" />
                </span>
                <span
                    className="icon-container"
                    onClick={() => {
                        setShapeListVisible(!isShapeListVisible);
                    }}
                >
                    <Icon srcUrl={SquareIcon} className="side-bar-icon" />
                </span>

                <span className="icon-container" onClick={handleLineClick}>
                    <Icon srcUrl={LineIcon} className="side-bar-icon" />
                </span>

                <span className="icon-container" onClick={handleScribbleClick}>
                    <Icon srcUrl={PenIcon} className="side-bar-icon" />
                </span>
            </div>

            {isShapeListVisible && (
                <ShapeList
                    clickOutside={() => {
                        setShapeListVisible(false);
                    }}
                    onSelection={handleShapeSelection}
                />
            )}
        </>
    );
};

export default SideBar;
