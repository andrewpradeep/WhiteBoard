import { IBoardObject, IViewport } from "../Contracts/WhiteBoard";
import { getShapeBounds } from "./anchorGeometry";

export interface CanvasPixelSize {
    width: number;
    height: number;
}

export const getVisibleWorldBounds = (
    viewport: IViewport,
    canvasWidth: number,
    canvasHeight: number
) => ({
    left: -viewport.offsetX / viewport.scale,
    top: -viewport.offsetY / viewport.scale,
    right: (canvasWidth - viewport.offsetX) / viewport.scale,
    bottom: (canvasHeight - viewport.offsetY) / viewport.scale,
});

const boundsOverlap = (
    first: { left: number; right: number; top: number; bottom: number },
    second: { left: number; right: number; top: number; bottom: number }
) =>
    !(
        first.right <= second.left ||
        first.left >= second.right ||
        first.bottom <= second.top ||
        first.top >= second.bottom
    );

export const isShapeVisibleInViewport = (
    boardObject: IBoardObject,
    viewport: IViewport,
    canvasPixelSize: CanvasPixelSize
) => {
    if (canvasPixelSize.width <= 1 || canvasPixelSize.height <= 1) {
        return true;
    }

    const shapeBounds = getShapeBounds(boardObject);
    const visibleBounds = getVisibleWorldBounds(
        viewport,
        canvasPixelSize.width,
        canvasPixelSize.height
    );

    return boundsOverlap(shapeBounds, visibleBounds);
};
