import { IViewport } from "../Contracts/WhiteBoard";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const DEFAULT_VIEWPORT: IViewport = { scale: 1, offsetX: 0, offsetY: 0 };

export const DEFAULT_SHAPE_CSS_PX = 72;
export const SHAPE_STROKE_CSS_PX = 2;

export const clampZoom = (scale: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));

export const getCanvasPixelRatio = (canvas: HTMLCanvasElement) => {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width) {
        return window.devicePixelRatio || 1;
    }

    return canvas.width / bounds.width;
};

export const getShapeWorldSize = (viewport: IViewport, pixelRatio: number) =>
    (DEFAULT_SHAPE_CSS_PX * pixelRatio) / viewport.scale;

export const getStrokeWorldWidth = (viewport: IViewport, pixelRatio: number) =>
    (SHAPE_STROKE_CSS_PX * pixelRatio) / viewport.scale;

export const screenToWorld = (
    clientX: number,
    clientY: number,
    canvasBounds: DOMRect,
    canvasWidth: number,
    canvasHeight: number,
    viewport: IViewport
) => {
    const displayScaleX = canvasWidth / canvasBounds.width;
    const displayScaleY = canvasHeight / canvasBounds.height;
    const localX = (clientX - canvasBounds.left) * displayScaleX;
    const localY = (clientY - canvasBounds.top) * displayScaleY;

    return {
        x: (localX - viewport.offsetX) / viewport.scale,
        y: (localY - viewport.offsetY) / viewport.scale,
    };
};

export const worldToScreen = (
    worldX: number,
    worldY: number,
    canvasBounds: DOMRect,
    canvasWidth: number,
    canvasHeight: number,
    viewport: IViewport
) => {
    const displayScaleX = canvasBounds.width / canvasWidth;
    const displayScaleY = canvasBounds.height / canvasHeight;
    const localX = worldX * viewport.scale + viewport.offsetX;
    const localY = worldY * viewport.scale + viewport.offsetY;

    return {
        left: canvasBounds.left + localX * displayScaleX,
        top: canvasBounds.top + localY * displayScaleY,
    };
};
