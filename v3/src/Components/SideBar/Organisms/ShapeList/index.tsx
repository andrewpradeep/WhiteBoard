import { useRef } from "react";

import { IBoardShapes } from "../../../../Contracts/WhiteBoard";
import Icon from "../../../Icon";
import CircleLogo from "../../../../assets/utility/circle.svg";
import SquareLogo from "../../../../assets/utility/shapes.svg";
import { IShapeListProps } from "./interface";
import useClickOutside from "../../../../Hooks/useClickOutside";
import "./index.css";

const ShapeList: React.FC<IShapeListProps> = ({ clickOutside, onSelection }) => {
    const ref = useRef<HTMLDivElement>(null);

    useClickOutside(ref, clickOutside);
    const textShapes = [
        { label: "Oval", shape: IBoardShapes.OVAL, symbol: "⬭", testId: "shape-pick-oval" },
        { label: "Triangle", shape: IBoardShapes.TRIANGLE, symbol: "△", testId: "shape-pick-triangle" },
        { label: "Star", shape: IBoardShapes.STAR, symbol: "☆", testId: "shape-pick-star" },
    ];

    const handleShapePick = (shape: IBoardShapes) => (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onSelection(shape);
    };

    return (
        <div
            className="shape-list-container"
            data-testid="shape-list"
            ref={ref}
            role="menu"
            aria-label="Shape picker"
            onMouseDown={(event) => event.stopPropagation()}
        >
            <button
                aria-label="Rectangle"
                className="icon-container"
                data-testid="shape-pick-rect"
                onClick={handleShapePick(IBoardShapes.RECT)}
                role="menuitem"
                type="button"
            >
                <Icon srcUrl={SquareLogo} className="side-bar-icon" />
            </button>
            <button
                aria-label="Circle"
                className="icon-container"
                data-testid="shape-pick-circle"
                onClick={handleShapePick(IBoardShapes.CIRCLE)}
                role="menuitem"
                type="button"
            >
                <Icon srcUrl={CircleLogo} className="side-bar-icon" />
            </button>
            {textShapes.map((item) => (
                <button
                    aria-label={item.label}
                    className="icon-container shape-symbol-button"
                    data-testid={item.testId}
                    key={item.shape}
                    onClick={handleShapePick(item.shape)}
                    role="menuitem"
                    type="button"
                >
                    {item.symbol}
                </button>
            ))}
            <button
                aria-label="Container"
                className="icon-container shape-symbol-button"
                data-testid="shape-pick-container"
                onClick={handleShapePick(IBoardShapes.CONTAINER)}
                role="menuitem"
                type="button"
            >
                ▢
            </button>
        </div>
    );
};

export default ShapeList;
