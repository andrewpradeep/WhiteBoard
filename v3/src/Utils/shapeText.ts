import {
    IBoardObject,
    IBoardShapes,
    ICircleObject,
    IRectObject,
} from "../Contracts/WhiteBoard";

export interface ShapeTextBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

const TEXT_PADDING_RATIO = 0.12;

export const supportsShapeText = (type: IBoardShapes) =>
    type === IBoardShapes.RECT ||
    type === IBoardShapes.SQUARE ||
    type === IBoardShapes.OVAL ||
    type === IBoardShapes.TRIANGLE ||
    type === IBoardShapes.STAR ||
    type === IBoardShapes.CIRCLE ||
    type === IBoardShapes.TEXT_BOX;

export const getShapeText = (boardObject: IBoardObject) => boardObject.text ?? "";

export const getShapeTextBounds = (boardObject: IBoardObject): ShapeTextBounds | null => {
    if (!supportsShapeText(boardObject.type)) {
        return null;
    }

    if (boardObject.type === IBoardShapes.CIRCLE) {
        const circleObject = boardObject as ICircleObject;
        const inset = circleObject.radius * (1 - TEXT_PADDING_RATIO);
        return {
            x: circleObject.x - inset,
            y: circleObject.y - inset,
            width: inset * 2,
            height: inset * 2,
        };
    }

    const rectObject = boardObject as IRectObject;
    const paddingX = Math.max(4, Math.abs(rectObject.width) * TEXT_PADDING_RATIO);
    const paddingY = Math.max(4, Math.abs(rectObject.height) * TEXT_PADDING_RATIO);

    return {
        x: rectObject.x + paddingX,
        y: rectObject.y + paddingY,
        width: Math.max(0, Math.abs(rectObject.width) - paddingX * 2),
        height: Math.max(0, Math.abs(rectObject.height) - paddingY * 2),
    };
};

export const getShapeFontSize = (bounds: ShapeTextBounds) => {
    const minDimension = Math.min(bounds.width, bounds.height);
    return Math.max(8, Math.min(18, minDimension / 4));
};

export const traceShapeClipPath = (
    canvasContext: CanvasRenderingContext2D,
    boardObject: IBoardObject
) => {
    switch (boardObject.type) {
        case IBoardShapes.RECT:
        case IBoardShapes.SQUARE:
        case IBoardShapes.TEXT_BOX: {
            const rectObject = boardObject as IRectObject;
            canvasContext.rect(rectObject.x, rectObject.y, rectObject.width, rectObject.height);
            break;
        }
        case IBoardShapes.OVAL: {
            const ovalObject = boardObject as IRectObject;
            canvasContext.ellipse(
                ovalObject.x + ovalObject.width / 2,
                ovalObject.y + ovalObject.height / 2,
                Math.abs(ovalObject.width / 2),
                Math.abs(ovalObject.height / 2),
                0,
                0,
                2 * Math.PI
            );
            break;
        }
        case IBoardShapes.TRIANGLE: {
            const triangleObject = boardObject as IRectObject;
            canvasContext.moveTo(
                triangleObject.x + triangleObject.width / 2,
                triangleObject.y
            );
            canvasContext.lineTo(
                triangleObject.x + triangleObject.width,
                triangleObject.y + triangleObject.height
            );
            canvasContext.lineTo(triangleObject.x, triangleObject.y + triangleObject.height);
            canvasContext.closePath();
            break;
        }
        case IBoardShapes.STAR: {
            const starObject = boardObject as IRectObject;
            const centerX = starObject.x + starObject.width / 2;
            const centerY = starObject.y + starObject.height / 2;
            const outerRadius = Math.min(Math.abs(starObject.width), Math.abs(starObject.height)) / 2;
            const innerRadius = outerRadius / 2.4;

            for (let index = 0; index < 10; index += 1) {
                const radius = index % 2 === 0 ? outerRadius : innerRadius;
                const angle = -Math.PI / 2 + (index * Math.PI) / 5;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                if (index === 0) {
                    canvasContext.moveTo(x, y);
                } else {
                    canvasContext.lineTo(x, y);
                }
            }
            canvasContext.closePath();
            break;
        }
        case IBoardShapes.CIRCLE: {
            const circleObject = boardObject as ICircleObject;
            canvasContext.arc(circleObject.x, circleObject.y, circleObject.radius, 0, 2 * Math.PI);
            break;
        }
        default:
            break;
    }
};

export const wrapTextLines = (
    canvasContext: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
) => {
    if (maxWidth <= 0) {
        return [];
    }

    const lines: string[] = [];

    text.split(/\r?\n/).forEach((paragraph) => {
        if (!paragraph) {
            lines.push("");
            return;
        }

        const words = paragraph.split(/\s+/);
        let currentLine = "";

        words.forEach((word) => {
            const candidate = currentLine ? `${currentLine} ${word}` : word;
            if (canvasContext.measureText(candidate).width <= maxWidth || !currentLine) {
                currentLine = candidate;
                return;
            }

            lines.push(currentLine);
            currentLine = word;
        });

        if (currentLine) {
            lines.push(currentLine);
        }
    });

    return lines;
};

export const drawClippedShapeText = (
    canvasContext: CanvasRenderingContext2D,
    boardObject: IBoardObject
) => {
    const text = getShapeText(boardObject);
    if (!text.trim() || !supportsShapeText(boardObject.type)) {
        return;
    }

    const bounds = getShapeTextBounds(boardObject);
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        return;
    }

    const fontSize = getShapeFontSize(bounds);
    const lineHeight = fontSize * 1.3;

    canvasContext.save();
    canvasContext.beginPath();
    traceShapeClipPath(canvasContext, boardObject);
    canvasContext.clip();

    canvasContext.font = `${fontSize}px Helvetica, Arial, sans-serif`;
    canvasContext.fillStyle = "#000";
    canvasContext.textBaseline = "top";

    const lines = wrapTextLines(canvasContext, text, bounds.width);
    const totalTextHeight = lines.length * lineHeight;
    let currentY = bounds.y + Math.max(0, (bounds.height - totalTextHeight) / 2);

    lines.forEach((line) => {
        if (currentY + lineHeight > bounds.y + bounds.height) {
            return;
        }

        canvasContext.fillText(line, bounds.x, currentY, bounds.width);
        currentY += lineHeight;
    });

    canvasContext.restore();
};
