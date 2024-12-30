import Icon from "../Icon";
import "./index.css";
import SquareIcon from "../../assets/utility/shapes.svg";
import LineIcon from "../../assets/utility/arrow.svg";
import PenIcon from "../../assets/utility/pen.svg";
// import pointerIcon from "../../assets/utility/pointer.svg";
import cursorPointerIcon from "../../assets/utility/cursor-pointer.svg";

import { useState } from "react";
import { IBoardMode, IBoardShapes } from "../../Contracts/WhiteBoard";
import {
    setBoardMode,
    setSelectedShapeAction,
} from "../../Store/WhiteBoardStore";
import { useDispatch } from "react-redux";
import ShapeList from "./Organisms/ShapeList";
import { useSelector } from "react-redux";
import { RootState } from "../../rootReducer";

const SideBar: React.FC = () => {
    const dispatch = useDispatch();
    const [isShapeListVisible, setShapeListVisible] = useState(false);

    const {boardMode} = useSelector((state:RootState)=>{
        return {
            boardMode: state.WhiteBoardStore.boardMode
        }
    })
    const handlePointerClick = ()=>{
        dispatch(setBoardMode(IBoardMode.SELECTION));
    }

    const handleShapeSelection = (shape: IBoardShapes) => {
        setShapeListVisible(false);
        dispatch(setSelectedShapeAction(shape));
    };

    const handleLineClick = () => {
        dispatch(setBoardMode(IBoardMode.ADD_LINE));
    };

    const handleScribbleClick = ()=>{
        dispatch(setBoardMode(IBoardMode.SCRIBBLE));
    }

    return (
        <>
            <div className="side-bar">
                <span className={`icon-container ${boardMode === IBoardMode.SELECTION && "selected"}`} onClick={handlePointerClick}>
                    <Icon srcUrl={cursorPointerIcon}  className="side-bar-icon" />
                </span>
                <span
                    className={`icon-container ${boardMode === IBoardMode.ADD_SHAPE && "selected"}`}
                    onClick={() => {
                        setShapeListVisible(!isShapeListVisible);
                    }}
                >
                    <Icon srcUrl={SquareIcon} className="side-bar-icon" />

                    {isShapeListVisible && (
                <ShapeList
                    clickOutside={() => {
                        setShapeListVisible(false);
                    }}
                    onSelection={handleShapeSelection}
                />
            )}
                </span>

                <span className={`icon-container ${boardMode === IBoardMode.ADD_LINE && "selected"}`}onClick={handleLineClick}>
                    <Icon srcUrl={LineIcon} className="side-bar-icon" />
                </span>

                <span className={`icon-container ${boardMode === IBoardMode.SCRIBBLE && "selected"}`} onClick={handleScribbleClick}>
                    <Icon srcUrl={PenIcon} className="side-bar-icon" />
                </span>
            </div>

           
        </>
    );
};

export default SideBar;
