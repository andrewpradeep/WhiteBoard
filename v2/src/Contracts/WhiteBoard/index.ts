export enum IBoardShapes {
    SQUARE = "square",
    RECT = "rect",
    CIRCLE = "circle",
    OVAL = "oval",
    TRIANGLE = "triangle",
    STAR = "star",
    LINE = "line",
    ARROW = "arrow",
    SCRIBBLE = "scribble",
    TEXT_BOX= "text_box"
}

export interface IBoardObjectDefaultprops {
    id: string;
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

export interface ITextBoxObject extends IRectObject{
    text: string;
    html: string
}


export type IBoardObject = IRectObject | ICircleObject | ILineObject | IScribbleObject | ITextBoxObject;

export interface IBoard {
    id: string;
    name: string;
    ObjectList: IBoardObject[];
}

export interface IWorkspace {
    id: string;
    name: string;
    description: string;
    boards: IBoard[];
}

export enum IBoardMode {
    SELECTION = "selection",
    ADD_SHAPE = "add_shape",
    ADD_LINE = "add_line",
    SCRIBBLE = "scribble",
    ADD_TEXT_BOX = "add_text_box",
    ERASER = "eraser"
}

export interface IPlotPoint {
    x: number;
    y: number;
}
