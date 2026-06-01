import { useRef } from "react";

import { IBoardShapes } from "../../../../Contracts/WhiteBoard";
import Icon from "../../../Icon";
import CircleLogo from "../../../../assets/utility/circle.svg";
import SquareLogo from "../../../../assets/utility/shapes.svg";
import { IShapeListProps } from "./interface";
import useClickOutside from "../../../../Hooks/useClickOutside";

const ShapeList: React.FC<IShapeListProps> = ({ clickOutside, onSelection }) => {
    const ref = useRef<HTMLDivElement>(null);

    useClickOutside(ref, clickOutside);

    return (
        <div className="shape-list-container" ref={ref}>
            <span
                className="icon-container"
                onClick={() => {
                    onSelection(IBoardShapes.RECT);
                }}
            >
                <Icon srcUrl={SquareLogo} className="side-bar-icon" />
            </span>
            <span
                className="icon-container"
                onClick={() => {
                    onSelection(IBoardShapes.CIRCLE);
                }}
            >
                <Icon srcUrl={CircleLogo} className="side-bar-icon" />
            </span>
        </div>
    );
};

export default ShapeList;
