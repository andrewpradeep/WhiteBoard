import {
    IBoard,
    IBoardObject,
    IBoardShapes,
    ICircleObject,
    ILineObject,
    IRectObject,
} from "../../Contracts/WhiteBoard";

const formatNumber = (value: number) => {
    const roundedValue = Math.round(value);
    return String(Math.max(0, roundedValue));
};

const formatToken = (kind: string, x: number, y: number, size: number) => {
    return `${kind}(${formatNumber(x)},${formatNumber(y)},${formatNumber(size)})`;
};

const getRectSize = (boardObject: IRectObject) => {
    return Math.max(Math.abs(boardObject.width), Math.abs(boardObject.height), 1);
};

export const boardObjectToDslToken = (boardObject: IBoardObject): string | null => {
    switch (boardObject.type) {
        case IBoardShapes.RECT: {
            const rectObject = boardObject as IRectObject;
            const kind =
                Math.abs(Math.abs(rectObject.width) - Math.abs(rectObject.height)) < 1
                    ? "sq"
                    : "rect";
            return formatToken(kind, rectObject.x, rectObject.y, getRectSize(rectObject));
        }
        case IBoardShapes.SQUARE: {
            const squareObject = boardObject as IRectObject;
            return formatToken("sq", squareObject.x, squareObject.y, getRectSize(squareObject));
        }
        case IBoardShapes.CIRCLE: {
            const circleObject = boardObject as ICircleObject;
            return formatToken("cr", circleObject.x, circleObject.y, circleObject.radius);
        }
        case IBoardShapes.TRIANGLE: {
            const triangleObject = boardObject as IRectObject;
            return formatToken("tri", triangleObject.x, triangleObject.y, getRectSize(triangleObject));
        }
        case IBoardShapes.LINE: {
            const lineObject = boardObject as ILineObject;
            const size = Math.max(Math.hypot(lineObject.dx, lineObject.dy), 1);
            return formatToken("line", lineObject.x, lineObject.y, size);
        }
        default:
            return null;
    }
};

export const boardToDsl = (objectList: IBoardObject[]) => {
    return objectList.map(boardObjectToDslToken).filter(Boolean).join(" ");
};

export const boardToDslState = (board?: IBoard) => {
    return board ? boardToDsl(board.ObjectList) : "";
};

export const boardToNamedDsl = (objectList: IBoardObject[]) => {
    return objectList
        .map((boardObject) => {
            const token = boardObjectToDslToken(boardObject);
            if (!token) {
                return null;
            }

            return boardObject.displayName ? `${boardObject.displayName}=${token}` : token;
        })
        .filter(Boolean)
        .join(" ");
};

export const boardToNamedDslState = (board?: IBoard) => {
    return board ? boardToNamedDsl(board.ObjectList) : "";
};

export const createGeometricPrompt = (board: IBoard | undefined, command: string) => {
    return `state: ${boardToNamedDslState(board)} cmd: ${command.trim()}`;
};
