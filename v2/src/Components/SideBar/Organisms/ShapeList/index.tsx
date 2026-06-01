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
    const textShapes = [
        { label: "Oval", shape: IBoardShapes.OVAL, symbol: "⬭" },
        { label: "Triangle", shape: IBoardShapes.TRIANGLE, symbol: "△" },
        { label: "Star", shape: IBoardShapes.STAR, symbol: "☆" },
    ];

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
            {textShapes.map((item) => (
                <button
                    className="icon-container shape-symbol-button"
                    key={item.shape}
                    onClick={() => {
                        onSelection(item.shape);
                    }}
                    title={item.label}
                    type="button"
                >
                    {item.symbol}
                </button>
            ))}
        </div>
    );
};

export default ShapeList;
