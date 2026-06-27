import {
    IBoard,
    IBoardMode,
    IBoardObject,
    IBoardObjectDefaultprops,
    IBoardShapes,
    ICircleObject,
    IContainerObject,
    ILineObject,
    ILineVectorPoints,
    IPlotPoint,
    IRectObject,
    IScribbleObject,
    ITextBoxObject,
    IViewport,
    IWhiteboardDocument,
} from "../../Contracts/WhiteBoard";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getDistanceOfPoints, getResizeHandleAtPoint, findSelectedObjectAtPoint, isBoardObjectSelected, SELECTION_PADDING } from "../../Utils/WhiteBoard";
import {
    applyAttachmentsToLine,
    detachLinesFromObject,
    findNearestAnchor,
    isCompleteConnector,
    syncAttachedLines,
    toLineAttachment,
} from "../../Utils/anchorGeometry";
import { getCurveBendFromPoint, getHandleHitRadius, getLineGeometry, isLineOrArrow, computeConnectorBend } from "../../Utils/lineGeometry";
import { clampZoom, DEFAULT_VIEWPORT, getShapeWorldSize } from "../../Utils/viewport";
import { supportsShapeText } from "../../Utils/shapeText";
import {
    attachNewObjectToContainerAtPoint,
    collectContainerDescendantIds,
    deleteContainerChildren,
    removeObjectFromContainers,
    syncContainerMembership,
    translateContainerChildren,
    wrapGeneratedShapesInContainer,
} from "../../Utils/containerGeometry";
import { assignDisplayName, assignDisplayNames, ensureBoardDisplayNames } from "../../Utils/objectNaming";

export const MAX_TOTAL_BOARDS = 50;
export const MAX_ELEMENTS_PER_BOARD = 500;
export type ExportFormat = "png";

export interface ISelectedObjectDetail {
    id: string;
    lastX: number;
    lastY: number;
    resizeHandle?: "bottom-right" | "radius";
}

export interface WhiteBoardState extends IWhiteboardDocument {
    selectedShape: IBoardShapes | null;
    boardMode: IBoardMode;
    selectedBoardObject: ISelectedObjectDetail | null;
    isDraggingInCanvas: boolean;
    isPanningViewport: boolean;
    lastPanClientX: number;
    lastPanClientY: number;
    draftObjectId: string | null;
    shapeTextEditId: string | null;
    showElementNames: boolean;
    canvasPixelSize: { width: number; height: number };
    viewport: IViewport;
    exportRequest: {
        id: number;
        format: ExportFormat;
    };
}

export interface PointerPayload extends IPlotPoint {
    pixelRatio?: number;
    clientX?: number;
    clientY?: number;
    viewportScale?: number;
}

export interface TextUpdatePayload {
    id: string;
    text: string;
    width?: number;
    height?: number;
}

export type DurableWhiteBoardPayload = IWhiteboardDocument;

const createId = (prefix: string) =>
    `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;

const createBoard = (name: string): IBoard => ({
    id: createId("board"),
    name,
    ObjectList: [],
});

const initialState: WhiteBoardState = {
    boards: [],
    activeBoardId: "",
    version: 1,
    selectedShape: null,
    boardMode: IBoardMode.SELECTION,
    selectedBoardObject: null,
    isDraggingInCanvas: false,
    isPanningViewport: false,
    lastPanClientX: 0,
    lastPanClientY: 0,
    draftObjectId: null,
    shapeTextEditId: null,
    showElementNames: false,
    canvasPixelSize: { width: 1, height: 1 },
    viewport: DEFAULT_VIEWPORT,
    exportRequest: {
        id: 0,
        format: "png",
    },
};

export const getActiveBoard = (state: WhiteBoardState) => {
    return (
        state.boards.find((board) => board.id === state.activeBoardId) ?? state.boards[0]
    );
};

export const getTotalBoardCount = (state: WhiteBoardState) => state.boards.length;

export const canCreateBoard = (state: WhiteBoardState) =>
    getTotalBoardCount(state) < MAX_TOTAL_BOARDS;

export const canAddElementToBoard = (board?: IBoard) =>
    !!board && board.ObjectList.length < MAX_ELEMENTS_PER_BOARD;

const createBoardObject = (
    selectedShape: IBoardShapes,
    point: PointerPayload,
    viewport: IViewport
): IBoardObject | null => {
    const pixelRatio = point.pixelRatio ?? window.devicePixelRatio ?? 1;
    const shapeSize = getShapeWorldSize(viewport, pixelRatio);
    const baseObject: IBoardObjectDefaultprops = {
        id: createId("object"),
        x: point.x,
        y: point.y,
        type: selectedShape,
    };

    switch (selectedShape) {
        case IBoardShapes.RECT:
        case IBoardShapes.TRIANGLE:
        case IBoardShapes.STAR:
        case IBoardShapes.OVAL:
            return { width: shapeSize, height: shapeSize, text: "", ...baseObject };
        case IBoardShapes.CIRCLE:
            return { radius: shapeSize / 2, text: "", ...baseObject };
        case IBoardShapes.LINE:
        case IBoardShapes.ARROW:
            return { ...baseObject, dx: 0, dy: 0, curveBend: 0 };
        case IBoardShapes.SCRIBBLE:
            return { ...baseObject, path: [] };
        case IBoardShapes.TEXT_BOX:
            return {
                ...baseObject,
                width: shapeSize * 2,
                height: shapeSize * 0.6,
                text: "",
                html: "",
            };
        case IBoardShapes.CONTAINER:
            return {
                ...baseObject,
                width: shapeSize * 2.4,
                height: shapeSize * 1.8,
                childIds: [],
            };
        default:
            return null;
    }
};

const findSelectedObject = (board: IBoard, point: PointerPayload) =>
    findSelectedObjectAtPoint(board.ObjectList, point.x, point.y);

const eraseObjectsAtPoint = (board: IBoard, point: PointerPayload) => {
    const targets = board.ObjectList.filter((boardObject) =>
        isBoardObjectSelected(boardObject, point.x, point.y)
    );
    const removedIds = new Set<string>();

    targets.forEach((boardObject) => {
        if (boardObject.type === IBoardShapes.CONTAINER) {
            collectContainerDescendantIds(board.ObjectList, boardObject.id).forEach((childId) =>
                removedIds.add(childId)
            );
        }
        removedIds.add(boardObject.id);
    });

    removedIds.forEach((objectId) => removeObjectFromContainers(board.ObjectList, objectId));
    board.ObjectList = board.ObjectList.filter((boardObject) => !removedIds.has(boardObject.id));
};

const getResizeHandle = (boardObject: IBoardObject, point: PointerPayload) => {
    const hitRadius = getHandleHitRadius(point);
    return getResizeHandleAtPoint(boardObject, point, hitRadius);
};

const getLineDragHandle = (lineObject: ILineObject, point: PointerPayload) => {
    const hitRadius = getHandleHitRadius(point);
    const { start, end, curveMidpoint } = getLineGeometry(lineObject);
    const handles: Array<{ type: ILineVectorPoints; x: number; y: number }> = [
        { type: ILineVectorPoints.INITIAL, x: start.x, y: start.y },
        { type: ILineVectorPoints.TERMINAL, x: end.x, y: end.y },
        { type: ILineVectorPoints.CURVE, x: curveMidpoint.x, y: curveMidpoint.y },
    ];

    const hitHandle = handles
        .map((handle) => ({
            type: handle.type,
            distance: getDistanceOfPoints({ x: handle.x, y: handle.y }, point),
        }))
        .filter((handle) => handle.distance < hitRadius)
        .sort((left, right) => left.distance - right.distance)[0];

    return hitHandle?.type;
};

const findLineHandleTarget = (board: IBoard, point: PointerPayload) => {
    syncAttachedLines(board.ObjectList);

    for (let index = board.ObjectList.length - 1; index >= 0; index -= 1) {
        const boardObject = board.ObjectList[index];
        if (!isLineOrArrow(boardObject)) {
            continue;
        }

        const handle = getLineDragHandle(boardObject, point);
        if (handle) {
            return { boardObject, handle };
        }
    }

    return null;
};

const getConnectorLineType = (state: WhiteBoardState): IBoardShapes.LINE | IBoardShapes.ARROW =>
    state.selectedShape === IBoardShapes.ARROW ? IBoardShapes.ARROW : IBoardShapes.LINE;

const CONNECTOR_ARROW_TYPE = IBoardShapes.ARROW;

const createConnectorLine = (
    lineType: IBoardShapes.LINE | IBoardShapes.ARROW,
    anchorHit: ReturnType<typeof findNearestAnchor>
) => {
    if (!anchorHit) {
        return null;
    }

    return {
        id: createId("object"),
        x: anchorHit.x,
        y: anchorHit.y,
        type: lineType,
        dx: 0,
        dy: 0,
        curveBend: 0,
        fromAttachment: toLineAttachment(anchorHit),
    } satisfies ILineObject;
};

const snapLineEndpoint = (
    lineObject: ILineObject,
    point: PointerPayload,
    objects: IBoardObject[],
    endpoint: "from" | "to"
) => {
    const excludeIds = lineObject.fromAttachment ? [lineObject.fromAttachment.objectId] : [];
    const anchorHit = findNearestAnchor(objects, point, getHandleHitRadius(point), excludeIds);

    if (endpoint === "from") {
        lineObject.fromAttachment = anchorHit ? toLineAttachment(anchorHit) : undefined;
    } else {
        lineObject.toAttachment = anchorHit ? toLineAttachment(anchorHit) : undefined;
    }

    applyAttachmentsToLine(lineObject, objects);
};

const MIN_FREE_LINE_LENGTH = 5;

const finalizeDraftLine = (board: IBoard, lineObject: ILineObject, state: WhiteBoardState) => {
    if (lineObject.fromAttachment) {
        if (!isCompleteConnector(lineObject)) {
            board.ObjectList = board.ObjectList.filter((item) => item.id !== lineObject.id);
            state.selectedBoardObject = null;
            return;
        }

        lineObject.type = IBoardShapes.ARROW;
        applyAttachmentsToLine(lineObject, board.ObjectList);
        lineObject.curveBend = computeConnectorBend(lineObject, board.ObjectList);
        state.selectedBoardObject = {
            id: lineObject.id,
            lastX: 0,
            lastY: 0,
        };
        return;
    }

    const lineLength = Math.hypot(lineObject.dx, lineObject.dy);
    if (lineLength < MIN_FREE_LINE_LENGTH) {
        board.ObjectList = board.ObjectList.filter((item) => item.id !== lineObject.id);
        state.selectedBoardObject = null;
        return;
    }

    state.selectedBoardObject = {
        id: lineObject.id,
        lastX: 0,
        lastY: 0,
    };
};

const startConnectorDraft = (
    board: IBoard,
    state: WhiteBoardState,
    lineType: IBoardShapes.LINE | IBoardShapes.ARROW,
    anchorHit: NonNullable<ReturnType<typeof findNearestAnchor>>
) => {
    const lineObject = createConnectorLine(lineType, anchorHit);
    if (!lineObject) {
        state.isDraggingInCanvas = false;
        return;
    }

    assignDisplayName(board.ObjectList, lineObject);
    board.ObjectList.push(lineObject);
    state.draftObjectId = lineObject.id;
    state.boardMode = IBoardMode.ADD_CONNECTOR;
    state.selectedShape = lineType;
    state.selectedBoardObject = null;
};

const allowsAnchorConnection = (boardMode: IBoardMode) =>
    boardMode === IBoardMode.SELECTION ||
    boardMode === IBoardMode.ADD_LINE ||
    boardMode === IBoardMode.ADD_CONNECTOR;

const WhiteBoardSlice = createSlice({
    name: "WhiteBoardStore",
    initialState,
    reducers: {
        hydrateWhiteBoardState(state, action: PayloadAction<DurableWhiteBoardPayload>) {
            let remainingBoardCount = MAX_TOTAL_BOARDS;
            const boards = action.payload.boards.reduce<IBoard[]>((sanitizedBoards, board) => {
                if (remainingBoardCount <= 0) {
                    return sanitizedBoards;
                }

                sanitizedBoards.push({
                    ...board,
                    ObjectList: board.ObjectList.slice(0, MAX_ELEMENTS_PER_BOARD),
                });
                remainingBoardCount -= 1;
                return sanitizedBoards;
            }, []);

            if (!boards.length) {
                return;
            }

            state.boards = boards;
            state.boards.forEach((board) => {
                ensureBoardDisplayNames(board.ObjectList);
                syncAttachedLines(board.ObjectList);
            });
            state.activeBoardId =
                boards.find((board) => board.id === action.payload.activeBoardId)?.id ??
                boards[0].id;
            state.version = action.payload.version ?? 1;
            state.selectedShape = null;
            state.boardMode = IBoardMode.SELECTION;
            state.selectedBoardObject = null;
            state.isDraggingInCanvas = false;
            state.isPanningViewport = false;
            state.draftObjectId = null;
            state.shapeTextEditId = null;
            state.viewport = DEFAULT_VIEWPORT;
            state.exportRequest = { id: 0, format: "png" };
        },
        initializeDocument(state, action: PayloadAction<DurableWhiteBoardPayload>) {
            WhiteBoardSlice.caseReducers.hydrateWhiteBoardState(state, action);
        },
        createBoardAction(state) {
            if (!canCreateBoard(state)) {
                return;
            }

            const board = createBoard(`Board ${state.boards.length + 1}`);
            state.boards.push(board);
            state.activeBoardId = board.id;
            state.selectedBoardObject = null;
            state.boardMode = IBoardMode.SELECTION;
            state.selectedShape = null;
            state.version += 1;
        },
        renameBoardAction(state, action: PayloadAction<{ id: string; name: string }>) {
            const board = state.boards.find((item) => item.id === action.payload.id);
            if (board && action.payload.name.trim()) {
                board.name = action.payload.name.trim();
                state.version += 1;
            }
        },
        switchBoardAction(state, action: PayloadAction<string>) {
            if (state.boards.some((board) => board.id === action.payload)) {
                state.activeBoardId = action.payload;
                state.selectedBoardObject = null;
                state.draftObjectId = null;
                state.shapeTextEditId = null;
                state.isDraggingInCanvas = false;
                state.boardMode = IBoardMode.SELECTION;
                state.selectedShape = null;
            }
        },
        setViewportScale(state, action: PayloadAction<number>) {
            state.viewport.scale = clampZoom(action.payload);
        },
        zoomBy(state, action: PayloadAction<number>) {
            state.viewport.scale = clampZoom(state.viewport.scale + action.payload);
        },
        resetViewport(state) {
            state.viewport = DEFAULT_VIEWPORT;
        },
        panViewport(state, action: PayloadAction<{ dx: number; dy: number }>) {
            state.viewport.offsetX += action.payload.dx;
            state.viewport.offsetY += action.payload.dy;
        },
        toolSelected(
            state,
            action: PayloadAction<{ mode: IBoardMode; shape?: IBoardShapes }>
        ) {
            state.boardMode = action.payload.mode;
            state.selectedShape = action.payload.shape ?? null;
            state.selectedBoardObject = null;
            state.draftObjectId = null;
            state.shapeTextEditId = null;
        },
        connectToolSelected(state, action: PayloadAction<IBoardShapes.LINE | IBoardShapes.ARROW>) {
            state.boardMode = IBoardMode.ADD_CONNECTOR;
            state.selectedShape = action.payload;
            state.draftObjectId = null;
            state.shapeTextEditId = null;
        },
        toggleShowElementNames(state) {
            state.showElementNames = !state.showElementNames;
        },
        setShowElementNames(state, action: PayloadAction<boolean>) {
            state.showElementNames = action.payload;
        },
        setCanvasPixelSize(state, action: PayloadAction<{ width: number; height: number }>) {
            state.canvasPixelSize = action.payload;
        },
        beginShapeTextEdit(state, action: PayloadAction<string>) {
            state.shapeTextEditId = action.payload;
        },
        endShapeTextEdit(state) {
            state.shapeTextEditId = null;
        },
        shapeDoubleClicked(state, action: PayloadAction<PointerPayload>) {
            const board = getActiveBoard(state);
            if (!board || state.boardMode !== IBoardMode.SELECTION) {
                return;
            }

            const point = action.payload;
            const boardObject = findSelectedObject(board, point);
            if (!boardObject || !supportsShapeText(boardObject.type)) {
                return;
            }

            state.selectedBoardObject = {
                id: boardObject.id,
                lastX: point.x - boardObject.x,
                lastY: point.y - boardObject.y,
            };

            if (boardObject.type !== IBoardShapes.TEXT_BOX) {
                state.shapeTextEditId = boardObject.id;
            }
        },
        pointerDown(state, action: PayloadAction<PointerPayload>) {
            const board = getActiveBoard(state);
            if (!board) {
                return;
            }

            const point = action.payload;
            state.isDraggingInCanvas = true;
            state.shapeTextEditId = null;
            syncAttachedLines(board.ObjectList);

            if (state.boardMode === IBoardMode.ERASER) {
                eraseObjectsAtPoint(board, point);
                state.selectedBoardObject = null;
                return;
            }

            if (state.selectedBoardObject) {
                const selectedObject = board.ObjectList.find(
                    (item) => item.id === state.selectedBoardObject?.id
                );
                const resizeHandle = selectedObject
                    ? getResizeHandle(selectedObject, point)
                    : undefined;

                if (selectedObject && resizeHandle) {
                    state.selectedBoardObject = {
                        id: selectedObject.id,
                        lastX: point.x - selectedObject.x,
                        lastY: point.y - selectedObject.y,
                        resizeHandle,
                    };
                    return;
                }
            }

            if (allowsAnchorConnection(state.boardMode)) {
                const anchorHit = findNearestAnchor(
                    board.ObjectList,
                    point,
                    getHandleHitRadius(point)
                );
                if (anchorHit) {
                    if (!canAddElementToBoard(board)) {
                        state.isDraggingInCanvas = false;
                        return;
                    }

                    startConnectorDraft(board, state, CONNECTOR_ARROW_TYPE, anchorHit);
                    return;
                }
            }

            if (state.boardMode === IBoardMode.ADD_SHAPE && state.selectedShape) {
                if (!canAddElementToBoard(board)) {
                    state.isDraggingInCanvas = false;
                    return;
                }

                const boardObject = createBoardObject(state.selectedShape, point, state.viewport);
                if (boardObject) {
                    assignDisplayName(board.ObjectList, boardObject);
                    board.ObjectList.push(boardObject);
                    attachNewObjectToContainerAtPoint(board.ObjectList, boardObject, point);
                }
                state.boardMode = IBoardMode.SELECTION;
                state.selectedShape = null;
                state.isDraggingInCanvas = false;
                return;
            }

            if (state.boardMode === IBoardMode.ADD_LINE || state.boardMode === IBoardMode.ADD_CONNECTOR) {
                if (!canAddElementToBoard(board)) {
                    state.isDraggingInCanvas = false;
                    state.boardMode = IBoardMode.SELECTION;
                    return;
                }

                const lineType = getConnectorLineType(state);
                const lineObject = createBoardObject(lineType, point, state.viewport);

                if (lineObject) {
                    assignDisplayName(board.ObjectList, lineObject);
                    board.ObjectList.push(lineObject);
                    state.draftObjectId = lineObject.id;
                    state.boardMode = IBoardMode.ADD_CONNECTOR;
                    state.selectedBoardObject = null;
                }
                return;
            }

            if (state.boardMode === IBoardMode.SCRIBBLE) {
                if (!canAddElementToBoard(board)) {
                    state.isDraggingInCanvas = false;
                    state.boardMode = IBoardMode.SELECTION;
                    return;
                }

                const scribbleObject = createBoardObject(IBoardShapes.SCRIBBLE, point, state.viewport);
                if (scribbleObject) {
                    assignDisplayName(board.ObjectList, scribbleObject);
                    board.ObjectList.push(scribbleObject);
                    state.draftObjectId = scribbleObject.id;
                }
                return;
            }

            if (state.boardMode === IBoardMode.ADD_TEXT_BOX) {
                if (!canAddElementToBoard(board)) {
                    state.isDraggingInCanvas = false;
                    state.boardMode = IBoardMode.SELECTION;
                    return;
                }

                const textBoxObject = createBoardObject(IBoardShapes.TEXT_BOX, point, state.viewport) as
                    | ITextBoxObject
                    | null;
                if (textBoxObject) {
                    assignDisplayName(board.ObjectList, textBoxObject);
                    board.ObjectList.push(textBoxObject);
                    attachNewObjectToContainerAtPoint(board.ObjectList, textBoxObject, point);
                    state.selectedBoardObject = {
                        id: textBoxObject.id,
                        lastX: textBoxObject.width / 2,
                        lastY: textBoxObject.height / 2,
                    };
                }
                state.boardMode = IBoardMode.SELECTION;
                state.selectedShape = null;
                state.isDraggingInCanvas = false;
                return;
            }

            if (state.boardMode === IBoardMode.SELECTION) {
                const handleTarget = findLineHandleTarget(board, point);
                if (handleTarget) {
                    const { boardObject, handle } = handleTarget;
                    state.selectedBoardObject = {
                        id: boardObject.id,
                        lastX: point.x - boardObject.x,
                        lastY: point.y - boardObject.y,
                    };
                    boardObject.draggingFromDestination = handle;
                    return;
                }
            }

            const selectedObject = findSelectedObject(board, point);
            if (!selectedObject) {
                state.selectedBoardObject = null;
                if (state.boardMode === IBoardMode.SELECTION) {
                    state.isPanningViewport = true;
                    state.lastPanClientX = point.clientX ?? 0;
                    state.lastPanClientY = point.clientY ?? 0;
                } else {
                    state.isDraggingInCanvas = false;
                }
                return;
            }

            state.selectedBoardObject = {
                id: selectedObject.id,
                lastX: point.x - selectedObject.x,
                lastY: point.y - selectedObject.y,
            };

            if (selectedObject.type === IBoardShapes.LINE || selectedObject.type === IBoardShapes.ARROW) {
                const lineObject = selectedObject as ILineObject;
                const dragHandle = getLineDragHandle(lineObject, point);
                if (dragHandle) {
                    lineObject.draggingFromDestination = dragHandle;
                }
            }
        },
        pointerMoved(state, action: PayloadAction<PointerPayload>) {
            if (!state.isDraggingInCanvas) {
                return;
            }

            const board = getActiveBoard(state);
            if (!board) {
                return;
            }

            const point = action.payload;

            if (state.isPanningViewport && state.boardMode === IBoardMode.SELECTION) {
                const clientX = point.clientX ?? state.lastPanClientX;
                const clientY = point.clientY ?? state.lastPanClientY;
                state.viewport.offsetX += clientX - state.lastPanClientX;
                state.viewport.offsetY += clientY - state.lastPanClientY;
                state.lastPanClientX = clientX;
                state.lastPanClientY = clientY;
                return;
            }

            if (state.boardMode === IBoardMode.ERASER) {
                eraseObjectsAtPoint(board, point);
                state.selectedBoardObject = null;
                return;
            }

            if (
                (state.boardMode === IBoardMode.ADD_LINE ||
                    state.boardMode === IBoardMode.ADD_CONNECTOR) &&
                state.draftObjectId
            ) {
                const lineObject = board.ObjectList.find(
                    (item) => item.id === state.draftObjectId
                ) as ILineObject | undefined;
                if (lineObject) {
                    applyAttachmentsToLine(lineObject, board.ObjectList);
                    const excludeIds = lineObject.fromAttachment
                        ? [lineObject.fromAttachment.objectId]
                        : [];
                    const anchorHit = findNearestAnchor(
                        board.ObjectList,
                        point,
                        getHandleHitRadius(point),
                        excludeIds
                    );
                    if (anchorHit) {
                        lineObject.dx = anchorHit.x - lineObject.x;
                        lineObject.dy = anchorHit.y - lineObject.y;
                    } else {
                        lineObject.dx = point.x - lineObject.x;
                        lineObject.dy = point.y - lineObject.y;
                    }
                }
                return;
            }

            if (state.boardMode === IBoardMode.SCRIBBLE && state.draftObjectId) {
                const scribbleObject = board.ObjectList.find(
                    (item) => item.id === state.draftObjectId
                ) as IScribbleObject | undefined;
                scribbleObject?.path.push(point);
                return;
            }

            if (!state.selectedBoardObject) {
                return;
            }

            const boardObject = board.ObjectList.find(
                (item) => item.id === state.selectedBoardObject?.id
            );
            if (!boardObject) {
                return;
            }

            if (state.selectedBoardObject.resizeHandle) {
                if (
                    state.selectedBoardObject.resizeHandle === "bottom-right" &&
                    (boardObject.type === IBoardShapes.RECT ||
                        boardObject.type === IBoardShapes.TEXT_BOX ||
                        boardObject.type === IBoardShapes.TRIANGLE ||
                        boardObject.type === IBoardShapes.STAR ||
                        boardObject.type === IBoardShapes.OVAL ||
                        boardObject.type === IBoardShapes.CONTAINER)
                ) {
                    const rectObject = boardObject as IRectObject;
                    rectObject.width = Math.max(20, point.x - rectObject.x - SELECTION_PADDING);
                    rectObject.height = Math.max(20, point.y - rectObject.y - SELECTION_PADDING);
                    syncAttachedLines(board.ObjectList);
                    return;
                }

                if (
                    state.selectedBoardObject.resizeHandle === "radius" &&
                    boardObject.type === IBoardShapes.CIRCLE
                ) {
                    const circleObject = boardObject as ICircleObject;
                    const nextRadiusX = point.x - circleObject.x - SELECTION_PADDING;
                    const nextRadiusY = point.y - circleObject.y - SELECTION_PADDING;
                    circleObject.radius = Math.max(10, Math.min(nextRadiusX, nextRadiusY));
                    syncAttachedLines(board.ObjectList);
                    return;
                }
            }

            if (
                (boardObject.type === IBoardShapes.LINE || boardObject.type === IBoardShapes.ARROW) &&
                (boardObject as ILineObject).draggingFromDestination
            ) {
                const lineObject = boardObject as ILineObject;
                if (lineObject.draggingFromDestination === ILineVectorPoints.CURVE) {
                    lineObject.curveBend = getCurveBendFromPoint(lineObject, point);
                    return;
                }
                if (lineObject.draggingFromDestination === ILineVectorPoints.TERMINAL) {
                    const excludeIds = lineObject.fromAttachment
                        ? [lineObject.fromAttachment.objectId]
                        : [];
                    const anchorHit = findNearestAnchor(
                        board.ObjectList,
                        point,
                        getHandleHitRadius(point),
                        excludeIds
                    );
                    if (anchorHit) {
                        lineObject.toAttachment = toLineAttachment(anchorHit);
                        applyAttachmentsToLine(lineObject, board.ObjectList);
                    } else {
                        lineObject.toAttachment = undefined;
                        lineObject.dx = point.x - lineObject.x;
                        lineObject.dy = point.y - lineObject.y;
                    }
                } else if (lineObject.draggingFromDestination === ILineVectorPoints.INITIAL) {
                    const excludeIds = lineObject.toAttachment
                        ? [lineObject.toAttachment.objectId]
                        : [];
                    const anchorHit = findNearestAnchor(
                        board.ObjectList,
                        point,
                        getHandleHitRadius(point),
                        excludeIds
                    );
                    if (anchorHit) {
                        lineObject.fromAttachment = toLineAttachment(anchorHit);
                        applyAttachmentsToLine(lineObject, board.ObjectList);
                    } else {
                        lineObject.fromAttachment = undefined;
                        lineObject.dx = lineObject.x - point.x + lineObject.dx;
                        lineObject.dy = lineObject.y - point.y + lineObject.dy;
                        lineObject.x = point.x;
                        lineObject.y = point.y;
                    }
                }
                return;
            }

            const nextX = point.x - state.selectedBoardObject.lastX;
            const nextY = point.y - state.selectedBoardObject.lastY;

            if (boardObject.type === IBoardShapes.SCRIBBLE) {
                const scribbleObject = boardObject as IScribbleObject;
                const deltaX = nextX - scribbleObject.x;
                const deltaY = nextY - scribbleObject.y;
                scribbleObject.x = nextX;
                scribbleObject.y = nextY;
                scribbleObject.path = scribbleObject.path.map((pathPoint) => ({
                    x: pathPoint.x + deltaX,
                    y: pathPoint.y + deltaY,
                }));
                return;
            }

            if (boardObject.type === IBoardShapes.CONTAINER) {
                const containerObject = boardObject as IContainerObject;
                const deltaX = nextX - containerObject.x;
                const deltaY = nextY - containerObject.y;
                containerObject.x = nextX;
                containerObject.y = nextY;
                translateContainerChildren(board.ObjectList, containerObject.id, deltaX, deltaY);
                return;
            }

            boardObject.x = nextX;
            boardObject.y = nextY;
            if (boardObject.parentId) {
                syncContainerMembership(board.ObjectList, boardObject);
            }
            syncAttachedLines(board.ObjectList);
        },
        pointerUp(state, action: PayloadAction<PointerPayload | undefined>) {
            const board = getActiveBoard(state);
            const finishedDraftId = state.draftObjectId;
            const point = action.payload;

            if (board && state.selectedBoardObject) {
                const boardObject = board.ObjectList.find(
                    (item) => item.id === state.selectedBoardObject?.id
                );
                if (
                    boardObject &&
                    (boardObject.type === IBoardShapes.LINE || boardObject.type === IBoardShapes.ARROW)
                ) {
                    (boardObject as ILineObject).draggingFromDestination = undefined;
                }

                if (boardObject && boardObject.type !== IBoardShapes.CONTAINER) {
                    syncContainerMembership(board.ObjectList, boardObject);
                }
            }

            state.isDraggingInCanvas = false;
            state.isPanningViewport = false;
            state.draftObjectId = null;
            if (state.selectedBoardObject) {
                state.selectedBoardObject.resizeHandle = undefined;
            }

            if (
                state.boardMode === IBoardMode.ADD_LINE ||
                state.boardMode === IBoardMode.ADD_CONNECTOR ||
                state.boardMode === IBoardMode.SCRIBBLE
            ) {
                if (finishedDraftId && board && point) {
                    const finishedObject = board.ObjectList.find((item) => item.id === finishedDraftId);
                    if (
                        finishedObject?.type === IBoardShapes.ARROW ||
                        finishedObject?.type === IBoardShapes.LINE
                    ) {
                        const lineObject = finishedObject as ILineObject;
                        snapLineEndpoint(lineObject, point, board.ObjectList, "to");
                        finalizeDraftLine(board, lineObject, state);
                    }
                }
                state.boardMode = IBoardMode.SELECTION;
            }
        },
        objectTextUpdated(state, action: PayloadAction<TextUpdatePayload>) {
            const board = getActiveBoard(state);
            const boardObject = board?.ObjectList.find((item) => item.id === action.payload.id);

            if (!boardObject || !supportsShapeText(boardObject.type)) {
                return;
            }

            boardObject.text = action.payload.text;

            if (
                boardObject.type === IBoardShapes.TEXT_BOX &&
                action.payload.width !== undefined &&
                action.payload.height !== undefined
            ) {
                const textObject = boardObject as ITextBoxObject;
                textObject.html = action.payload.text;
                textObject.width = action.payload.width;
                textObject.height = action.payload.height;
            }
        },
        applyGeneratedShapes(state, action: PayloadAction<IBoardObject[]>) {
            const board = getActiveBoard(state);
            if (!board || !action.payload.length) {
                return;
            }

            const remainingCapacity = MAX_ELEMENTS_PER_BOARD - board.ObjectList.length;
            if (remainingCapacity <= 0) {
                return;
            }

            const incomingShapes = action.payload.slice(0, remainingCapacity);
            assignDisplayNames(board.ObjectList, incomingShapes);
            const wrappedShapes = wrapGeneratedShapesInContainer(incomingShapes, () => createId("object"));
            const shapesToAdd =
                wrappedShapes.length <= remainingCapacity ? wrappedShapes : incomingShapes;

            const namedObjects = [...board.ObjectList];
            shapesToAdd.forEach((shape) => {
                assignDisplayName(namedObjects, shape);
                namedObjects.push(shape);
            });

            board.ObjectList.push(...shapesToAdd);
            state.selectedBoardObject = null;
            state.draftObjectId = null;
            state.isDraggingInCanvas = false;
            state.boardMode = IBoardMode.SELECTION;
            state.selectedShape = null;
        },
        deleteSelectedObjectAction(state) {
            const board = getActiveBoard(state);
            if (!board || !state.selectedBoardObject) {
                return;
            }

            const deletedId = state.selectedBoardObject.id;
            const deletedObject = board.ObjectList.find((item) => item.id === deletedId);

            if (deletedObject?.type === IBoardShapes.CONTAINER) {
                const childIds = deleteContainerChildren(board.ObjectList, deletedId);
                board.ObjectList = board.ObjectList.filter(
                    (item) => item.id !== deletedId && !childIds.includes(item.id)
                );
            } else {
                removeObjectFromContainers(board.ObjectList, deletedId);
                board.ObjectList = board.ObjectList.filter((item) => item.id !== deletedId);
            }

            detachLinesFromObject(board.ObjectList, deletedId);
            state.selectedBoardObject = null;
            state.draftObjectId = null;
            state.isDraggingInCanvas = false;
        },
        exportRequested(state) {
            state.exportRequest.id += 1;
            state.exportRequest.format = "png";
        },
    },
});

export const {
    hydrateWhiteBoardState,
    initializeDocument,
    createBoardAction,
    renameBoardAction,
    switchBoardAction,
    setViewportScale,
    zoomBy,
    resetViewport,
    panViewport,
    toolSelected,
    connectToolSelected,
    beginShapeTextEdit,
    endShapeTextEdit,
    shapeDoubleClicked,
    pointerDown,
    pointerMoved,
    pointerUp,
    objectTextUpdated,
    applyGeneratedShapes,
    deleteSelectedObjectAction,
    exportRequested,
    toggleShowElementNames,
    setShowElementNames,
    setCanvasPixelSize,
} = WhiteBoardSlice.actions;

export default WhiteBoardSlice.reducer;
