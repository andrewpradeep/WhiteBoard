import { useRef } from "react";

import { BoardShapes } from "../../../../Contracts/WhiteBoard";
import Icon from "../../../Icon";
import useClickOutside from "../../../../Hooks/useClickOutside";
import CircleLogo from "../../../../assets/utility/circle.svg";
import SquareLogo from "../../../../assets/utility/shapes.svg";
import { ShapeListProps } from "./interface";

const ShapeList: React.FC<ShapeListProps> = ({ clickOutside, onSelection }) => {
    const ref = useRef<HTMLDivElement>(null);

    useClickOutside(ref, clickOutside);

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

export default ShapeList;
