export enum BoardShapes {
    SQUARE = "square",
    CIRCLE = "circle",
    LINE = "line",
}

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

export interface LineObject extends BoardObjectDefaultprops {
    dx: number;
    dy: number;

    draggingFromDestination?: boolean;
}

export type BoardObject = SquareObject | CircleObject | LineObject;

export interface Board {
    ObjectList: BoardObject[];
}

export enum BoardMode {
    SELECTION = "selection",
    ADD_SHAPE = "add_shape",
    ADD_LINE = "add_line",
}

export interface PlotPoint {
    x: number;
    y: number;
}
