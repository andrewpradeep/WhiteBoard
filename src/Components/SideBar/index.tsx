import Icon from "../Icon";
import "./index.css";
import SquareLogo from "../../assets/utility/shapes.svg";
import CircleLogo from "../../assets/utility/circle.svg";
import { BoardShapes } from "../WhiteBoard/interface";
import { useEffect, useRef, useState } from "react";

export interface SideBarProps {
    onShapeSelection: (shape: BoardShapes) => void;
}

export interface ShapeListProps {
    clickOutside: () => void;
    onSelection: (shape: BoardShapes) => void;
}

const SideBar: React.FC<SideBarProps> = ({ onShapeSelection }) => {
    const [isShapeListVisible, setShapeListVisible] = useState(false);

    const handleShapeSelection = (shape: BoardShapes) => {
        setShapeListVisible(false);
        onShapeSelection(shape);
    };

    return (
        <>
            <div className="side-bar">
                <span
                    className="icon-container"
                    onClick={() => {
                        setShapeListVisible(!isShapeListVisible);
                    }}
                >
                    <Icon srcUrl={SquareLogo} className="side-bar-icon" />
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

const ShapeList: React.FC<ShapeListProps> = ({ clickOutside, onSelection }) => {
    const ref = useRef<HTMLDivElement>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleClickOutside = (event: any) => {
        if (!ref.current?.contains(event.target)) {
            event.stopPropagation();
            clickOutside();
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="shape-list" ref={ref}>
            <span
                className="icon-container"
                onClick={() => {
                    onSelection(BoardShapes.SQUARE);
                }}
            >
                <Icon srcUrl={SquareLogo} className="side-bar-icon" />
            </span>
            <span
                className="icon-container"
                onClick={() => {
                    onSelection(BoardShapes.CIRCLE);
                }}
            >
                <Icon srcUrl={CircleLogo} className="side-bar-icon" />
            </span>
        </div>
    );
};

export default SideBar;
