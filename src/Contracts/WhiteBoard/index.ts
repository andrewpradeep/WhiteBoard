export enum IBoardShapes {
    SQUARE = "square",
    RECT = "rect",
    CIRCLE = "circle",
    LINE = "line",
    SCRIBBLE = "scribble"
}

export interface IBoardObjectDefaultprops {
    x: number;
    y: number;
    type: IBoardShapes;
}

export interface IRectObject extends IBoardObjectDefaultprops {
    width: number;
    height: number;
}

export interface ICircleObject extends IBoardObjectDefaultprops {
    radius: number;
}


export enum ILineVectorPoints {
    TERMINAL = "terminal",
    INITIAL = "initial"

}
export interface ILineObject extends IBoardObjectDefaultprops {
    dx: number;
    dy: number;
    draggingFromDestination?: ILineVectorPoints;
}

export interface IScribbleObject extends IBoardObjectDefaultprops {
    path:IPlotPoint[];
}

export type IBoardObject = IRectObject | ICircleObject | ILineObject | IScribbleObject;

export interface IBoard {
    ObjectList: IBoardObject[];
}

export enum IBoardMode {
    SELECTION = "selection",
    ADD_SHAPE = "add_shape",
    ADD_LINE = "add_line",
    SCRIBBLE = "scribble"
}

export interface IPlotPoint {
    x: number;
    y: number;
}
