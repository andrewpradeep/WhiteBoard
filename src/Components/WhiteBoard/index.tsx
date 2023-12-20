import React, { MouseEventHandler, useEffect, useRef, useState } from "react";
import {
    BoardObject,
    BoardShapes,
    CircleObject,
    SelectedObjectDetail,
    SquareObject,
    WhiteBoardProps,
} from "./interface";
import "./index.css";

const WhiteBoard: React.FC<WhiteBoardProps> = ({
    width,
    height,
    className = "",
}) => {
    const [boardObjectList, setBoardObjectList] = useState<BoardObject[]>([
        {
            x: 25,
            y: 25,
            width: 60,
            height: 60,
            type: BoardShapes.SQUARE,
        },
        {
            x: 110,
            y: 25,
            radius: 30,
            type: BoardShapes.CIRCLE,
        },
    ]);
    const [canvasContext, setCanvasContext] = useState<
        CanvasRenderingContext2D | undefined | null
    >();

    const [selObjectDetail, setSelObjectDetail] =
        useState<SelectedObjectDetail | null>();

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        setCanvasContext(context);
    }, []);

    useEffect(() => {
        if (canvasContext) {
            drawObjects();
        }
    }, [canvasContext, boardObjectList]);

    const drawBackGround = () => {
        for (
            let i = 0;
            i <= (canvasRef.current?.width as number);
            i = i + 100
        ) {
            for (
                let j = 0;
                j <= (canvasRef.current?.height as number);
                j = j + 100
            ) {
                if (canvasContext) {
                    canvasContext?.beginPath();
                    canvasContext.strokeStyle = "rgba(0,0,0,0.1)";
                    canvasContext?.strokeRect(i, j, 100, 100);
                    canvasContext?.closePath();
                }
            }
        }
    };
    const clearCanvas = () => {
        canvasContext?.clearRect(
            0,
            0,
            canvasRef.current?.width as number,
            canvasRef.current?.height as number
        );
    };

    const drawObjects = () => {
        clearCanvas();
        drawBackGround();

        if (boardObjectList.length && canvasContext) {
            boardObjectList.forEach((boardObject) => {
                canvasContext?.beginPath();
                canvasContext.strokeStyle = "#000";
                drawShapes(boardObject);
                canvasContext?.closePath();
            });
        }
    };

    const drawShapes = (boardObject: BoardObject) => {
        switch (boardObject.type) {
            case BoardShapes.SQUARE:
                drawRect(boardObject as SquareObject);
                break;
            case BoardShapes.CIRCLE:
                drawCircle(boardObject as CircleObject);
                break;
            default:
                return;
        }
    };

    const drawRect = (boardObject: SquareObject) => {
        canvasContext?.strokeRect(
            boardObject.x,
            boardObject.y,
            boardObject.width,
            boardObject.height
        );
        canvasContext?.strokeRect(
            boardObject.x,
            boardObject.y,
            boardObject.width,
            boardObject.height
        );
    };

    const drawCircle = (boardObject: CircleObject) => {
        canvasContext?.arc(
            boardObject.x,
            boardObject.y,
            boardObject.radius,
            0,
            2 * Math.PI
        );
        canvasContext?.stroke();
    };

    const getSelectedObject = (clickX: number, clickY: number) => {
        for (let i = 0; i < boardObjectList.length; i++) {
            const boardObject = boardObjectList[i];
            if (isObjectSelected(boardObject, clickX, clickY)) {
                return i;
            }
        }
        return null;
    };

    const isObjectSelected = (
        boardObject: BoardObject,
        clickX: number,
        clickY: number
    ) => {
        switch (boardObject.type) {
            case BoardShapes.SQUARE: {
                // eslint-disable-next-line no-case-declarations
                const tempObject = boardObject as SquareObject;
                return (
                    clickX > tempObject.x &&
                    clickX < tempObject.x + tempObject.width &&
                    clickY > tempObject.y &&
                    clickY < tempObject.y + tempObject.height
                );
            }
            case BoardShapes.CIRCLE: {
                // eslint-disable-next-line no-case-declarations
                const tempObject = boardObject as CircleObject;
                return (
                    clickX > tempObject.x - tempObject.radius &&
                    clickX < tempObject.x + tempObject.radius &&
                    clickY > tempObject.y - tempObject.radius &&
                    clickY < tempObject.y + tempObject.radius
                );
            }
            default:
                return false;
        }
    };

    const handleMouseDown: MouseEventHandler<HTMLCanvasElement> = (event) => {
        const position = getSelectedObject(
            event.nativeEvent.offsetX,
            event.nativeEvent.offsetY
        );
        if (position !== null) {
            const boardObject = boardObjectList[position];
            setSelObjectDetail({
                position,
                lastX: event.nativeEvent.offsetX - boardObject.x,
                lastY: event.nativeEvent.offsetY - boardObject.y,
            });
        }
    };

    const handleMouseMove: MouseEventHandler<HTMLCanvasElement> = (event) => {
        if (selObjectDetail) {
            const boardObject = boardObjectList[selObjectDetail.position];
            boardObject.x = event.nativeEvent.offsetX - selObjectDetail.lastX;
            boardObject.y = event.nativeEvent.offsetY - selObjectDetail.lastY;

            const boardList = [...boardObjectList];
            boardList[selObjectDetail.position] = boardObject;
            setBoardObjectList(boardList);
        }
    };

    const handleMouseUp: MouseEventHandler<HTMLCanvasElement> = () => {
        setSelObjectDetail(null);
    };

    return (
        <>
            <canvas
                width={width}
                height={height}
                className={className}
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            ></canvas>
        </>
    );
};

export default WhiteBoard;
