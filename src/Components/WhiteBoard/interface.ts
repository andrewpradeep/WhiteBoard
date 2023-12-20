export interface BoardObjectDefaultprops {
    x: number;
    y: number;
    type: BoardShapes;
}

export interface SquareObject extends BoardObjectDefaultprops {
    width: number;
    height: number;
}

export interface CircleObject extends BoardObjectDefaultprops {
    radius: number;
}

export type BoardObject = SquareObject | CircleObject;

export interface WhiteBoardProps {
    className?: string;
    width: number;
    height: number;
}

export interface SelectedObjectDetail {
    lastX: number;
    lastY: number;
    position: number;
}

export enum BoardShapes {
    SQUARE = "square",
    CIRCLE = "circle",
}
