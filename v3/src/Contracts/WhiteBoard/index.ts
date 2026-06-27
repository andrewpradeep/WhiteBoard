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
    TEXT_BOX= "text_box",
    CONTAINER = "container"
}

export interface IBoardObjectDefaultprops {
    id: string;
    x: number;
    y: number;
    type: IBoardShapes;
    displayName?: string;
    text?: string;
    parentId?: string;
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
    INITIAL = "initial",
    CURVE = "curve",
}

export type AnchorSide = "top" | "bottom" | "left" | "right" | "center";

export interface ILineAttachment {
    objectId: string;
    side: AnchorSide;
}

export interface ILineObject extends IBoardObjectDefaultprops {
    dx: number;
    dy: number;
    curveBend?: number;
    fromAttachment?: ILineAttachment;
    toAttachment?: ILineAttachment;
    draggingFromDestination?: ILineVectorPoints;
}

export interface IScribbleObject extends IBoardObjectDefaultprops {
    path:IPlotPoint[];
}

export interface ITextBoxObject extends IRectObject{
    text: string;
    html: string
}

export interface IContainerObject extends IRectObject {
    childIds: string[];
}


export type IBoardObject = IRectObject | ICircleObject | ILineObject | IScribbleObject | ITextBoxObject | IContainerObject;

export interface IBoard {
    id: string;
    name: string;
    ObjectList: IBoardObject[];
}

export interface IViewport {
    scale: number;
    offsetX: number;
    offsetY: number;
}

export interface IWhiteboardDocument {
    boards: IBoard[];
    activeBoardId: string;
    version: number;
}

export enum IBoardMode {
    SELECTION = "selection",
    ADD_SHAPE = "add_shape",
    ADD_LINE = "add_line",
    ADD_CONNECTOR = "add_connector",
    SCRIBBLE = "scribble",
    ADD_TEXT_BOX = "add_text_box",
    ERASER = "eraser",
}

export interface IPlotPoint {
    x: number;
    y: number;
}
