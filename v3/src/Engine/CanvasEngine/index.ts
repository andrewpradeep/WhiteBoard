import { renderBoard } from "../../Utils/WhiteBoard";
import { IBoardObject, IViewport } from "../../Contracts/WhiteBoard";

const gridCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

const getGridLayer = (canvasRef: HTMLCanvasElement) => {
    const cached = gridCache.get(canvasRef);
    if (cached && cached.width === canvasRef.width && cached.height === canvasRef.height) {
        return cached;
    }

    const layer = document.createElement("canvas");
    layer.width = canvasRef.width;
    layer.height = canvasRef.height;
    const layerContext = layer.getContext("2d");
    if (layerContext) {
        renderBoard({
            canvasContext: layerContext,
            canvasRef: layer,
            objects: [],
            includeGrid: true,
        });
    }

    gridCache.set(canvasRef, layer);
    return layer;
};

export const renderBoardFrame = ({
    canvasContext,
    canvasRef,
    objects,
    selectedObject,
    viewport,
    showConnectionAnchors = false,
    showElementNames = false,
}: {
    canvasContext: CanvasRenderingContext2D;
    canvasRef: HTMLCanvasElement;
    objects: IBoardObject[];
    selectedObject?: { id: string } | null;
    viewport: IViewport;
    showConnectionAnchors?: boolean;
    showElementNames?: boolean;
}) => {
    canvasContext.save();
    canvasContext.setTransform(1, 0, 0, 1, 0, 0);
    canvasContext.clearRect(0, 0, canvasRef.width, canvasRef.height);

    const gridLayer = getGridLayer(canvasRef);
    canvasContext.drawImage(gridLayer, 0, 0);

    canvasContext.restore();

    renderBoard({
        canvasContext,
        canvasRef,
        objects,
        selectedObject,
        includeGrid: false,
        viewport,
        showConnectionAnchors,
        showElementNames,
    });
};
