export enum BoardShapes {
    SQUARE = "square",
    RECT = "rect",
    CIRCLE = "circle",
    LINE = "line",
    SCRIBBLE = "scribble"
}

export interface BoardObjectDefaultprops {
    x: number;
    y: number;
    type: BoardShapes;
}

export interface RectObject extends BoardObjectDefaultprops {
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

export interface ScribbleObject extends BoardObjectDefaultprops {
    path:PlotPoint[];
}

export type BoardObject = RectObject | CircleObject | LineObject | ScribbleObject;

export interface Board {
    ObjectList: BoardObject[];
}

export enum BoardMode {
    SELECTION = "selection",
    ADD_SHAPE = "add_shape",
    ADD_LINE = "add_line",
    SCRIBBLE = "scribble"
}

export interface PlotPoint {
    x: number;
    y: number;
}
