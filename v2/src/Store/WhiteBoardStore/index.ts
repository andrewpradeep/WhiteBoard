import {
    IBoard,
    IBoardMode,
    IBoardObject,
    IBoardObjectDefaultprops,
    IBoardShapes,
    ICircleObject,
    ILineObject,
    ILineVectorPoints,
    IPlotPoint,
    IRectObject,
    IScribbleObject,
    ITextBoxObject,
    IWorkspace,
} from "../../Contracts/WhiteBoard";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getDistanceOfPoints, isBoardObjectSelected } from "../../Utils/WhiteBoard";

export const MAX_TOTAL_BOARDS = 50;
export const MAX_ELEMENTS_PER_BOARD = 500;
export type ExportFormat = "pdf" | "png";

export interface ISelectedObjectDetail {
    id: string;
    lastX: number;
    lastY: number;
    resizeHandle?: "bottom-right" | "radius";
}

export interface WhiteBoardState {
    workspaces: IWorkspace[];
    activeWorkspaceId: string;
    activeBoardId: string;
    selectedShape: IBoardShapes | null;
    boardMode: IBoardMode;
    selectedBoardObject: ISelectedObjectDetail | null;
    isDraggingInCanvas: boolean;
    draftObjectId: string | null;
    exportRequest: {
        id: number;
        format: ExportFormat;
    };
}

export interface PointerPayload extends IPlotPoint {}

export interface TextUpdatePayload {
    id: string;
    text: string;
    html: string;
    width: number;
    height: number;
}

export interface WorkspaceCreatePayload {
    name: string;
    description: string;
}

export interface WorkspaceUpdatePayload extends WorkspaceCreatePayload {
    id: string;
}

export interface WorkspaceDeletePayload {
    id: string;
    moveBoardsToWorkspaceId?: string;
}

export interface DurableWhiteBoardPayload {
    workspaces: IWorkspace[];
    activeWorkspaceId: string;
    activeBoardId: string;
}

const createId = (prefix: string) => {
    return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
};

const createBoard = (name: string): IBoard => ({
    id: createId("board"),
    name,
    ObjectList: [],
});

const createWorkspace = ({ name, description }: WorkspaceCreatePayload): IWorkspace => ({
    id: createId("workspace"),
    name,
    description,
    boards: [createBoard("Board 1")],
});

const initialState: WhiteBoardState = {
    workspaces: [],
    activeWorkspaceId: "",
    activeBoardId: "",
    selectedShape: null,
    boardMode: IBoardMode.SELECTION,
    selectedBoardObject: null,
    isDraggingInCanvas: false,
    draftObjectId: null,
    exportRequest: {
        id: 0,
        format: "pdf",
    },
};

export const getActiveWorkspace = (state: WhiteBoardState) => {
    return (
        state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId) ??
        state.workspaces[0]
    );
};

export const getActiveBoard = (state: WhiteBoardState) => {
    const activeWorkspace = getActiveWorkspace(state);
    return (
        activeWorkspace?.boards.find((board) => board.id === state.activeBoardId) ??
        activeWorkspace?.boards[0]
    );
};

export const getTotalBoardCount = (state: WhiteBoardState) => {
    return state.workspaces.reduce((count, workspace) => count + workspace.boards.length, 0);
};

export const canCreateBoard = (state: WhiteBoardState) => {
    return getTotalBoardCount(state) < MAX_TOTAL_BOARDS;
};

export const canAddElementToBoard = (board?: IBoard) => {
    return !!board && board.ObjectList.length < MAX_ELEMENTS_PER_BOARD;
};

const createBoardObject = (
    selectedShape: IBoardShapes,
    point: PointerPayload
): IBoardObject | null => {
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
            return {
                width: 60,
                height: 60,
                ...baseObject,
            };
        case IBoardShapes.CIRCLE:
            return { radius: 30, ...baseObject };
        case IBoardShapes.LINE:
        case IBoardShapes.ARROW:
            return {
                ...baseObject,
                dx: 0,
                dy: 0,
            };
        case IBoardShapes.SCRIBBLE:
            return {
                ...baseObject,
                path: [],
            };
        case IBoardShapes.TEXT_BOX:
            return {
                ...baseObject,
                width: 150,
                height: 45,
                text: "",
                html: "",
            };
        default:
            return null;
    }
};

const findSelectedObject = (board: IBoard, point: PointerPayload) => {
    for (let index = board.ObjectList.length - 1; index >= 0; index -= 1) {
        const boardObject = board.ObjectList[index];
        if (isBoardObjectSelected(boardObject, point.x, point.y)) {
            return boardObject;
        }
    }

    return null;
};

const eraseObjectsAtPoint = (board: IBoard, point: PointerPayload) => {
    board.ObjectList = board.ObjectList.filter(
        (boardObject) => !isBoardObjectSelected(boardObject, point.x, point.y)
    );
};

const getResizeHandle = (boardObject: IBoardObject, point: PointerPayload) => {
    const handleSize = 12;

    if (
        boardObject.type === IBoardShapes.RECT ||
        boardObject.type === IBoardShapes.TEXT_BOX ||
        boardObject.type === IBoardShapes.TRIANGLE ||
        boardObject.type === IBoardShapes.STAR ||
        boardObject.type === IBoardShapes.OVAL
    ) {
        const rectObject = boardObject as IRectObject;
        return getDistanceOfPoints(
            { x: rectObject.x + rectObject.width, y: rectObject.y + rectObject.height },
            point
        ) <= handleSize
            ? "bottom-right"
            : undefined;
    }

    if (boardObject.type === IBoardShapes.CIRCLE) {
        const circleObject = boardObject as ICircleObject;
        return getDistanceOfPoints(
            { x: circleObject.x + circleObject.radius, y: circleObject.y },
            point
        ) <= handleSize
            ? "radius"
            : undefined;
    }

    return undefined;
};

const getLineDragHandle = (lineObject: ILineObject, point: PointerPayload) => {
    if (getDistanceOfPoints({ x: lineObject.x, y: lineObject.y }, point) < 10) {
        return ILineVectorPoints.INITIAL;
    }

    if (
        getDistanceOfPoints(
            { x: lineObject.x + lineObject.dx, y: lineObject.y + lineObject.dy },
            point
        ) < 10
    ) {
        return ILineVectorPoints.TERMINAL;
    }

    return undefined;
};

const WhiteBoardSlice = createSlice({
    name: "WhiteBoardStore",
    initialState,
    reducers: {
        hydrateWhiteBoardState(state, action: PayloadAction<DurableWhiteBoardPayload>) {
            let remainingBoardCount = MAX_TOTAL_BOARDS;
            const workspaces = action.payload.workspaces.reduce<IWorkspace[]>(
                (sanitizedWorkspaces, workspace) => {
                    if (remainingBoardCount <= 0) {
                        return sanitizedWorkspaces;
                    }

                    const boards = workspace.boards
                        .slice(0, remainingBoardCount)
                        .map((board) => ({
                            ...board,
                            ObjectList: board.ObjectList.slice(0, MAX_ELEMENTS_PER_BOARD),
                        }));

                    remainingBoardCount -= boards.length;

                    if (boards.length > 0) {
                        sanitizedWorkspaces.push({
                            ...workspace,
                            description: workspace.description ?? "",
                            boards,
                        });
                    }

                    return sanitizedWorkspaces;
                },
                []
            );

            if (!workspaces.length) {
                return;
            }

            state.workspaces = workspaces;
            state.activeWorkspaceId =
                workspaces.find(
                    (workspace) => workspace.id === action.payload.activeWorkspaceId
                )?.id ?? workspaces[0].id;

            const activeWorkspace = getActiveWorkspace(state);
            state.activeBoardId =
                activeWorkspace?.boards.find((board) => board.id === action.payload.activeBoardId)
                    ?.id ?? activeWorkspace?.boards[0].id;
            state.selectedShape = null;
            state.boardMode = IBoardMode.SELECTION;
            state.selectedBoardObject = null;
            state.isDraggingInCanvas = false;
            state.draftObjectId = null;
            state.exportRequest = {
                id: 0,
                format: "pdf",
            };
        },
        createWorkspaceAction(state, action: PayloadAction<WorkspaceCreatePayload>) {
            if (!canCreateBoard(state)) {
                return;
            }

            const workspaceName =
                action.payload.name.trim() || `Workspace ${state.workspaces.length + 1}`;
            const workspace = createWorkspace({
                name: workspaceName,
                description: action.payload.description.trim(),
            });
            state.workspaces.push(workspace);
            state.activeWorkspaceId = workspace.id;
            state.activeBoardId = workspace.boards[0].id;
            state.selectedBoardObject = null;
            state.draftObjectId = null;
            state.isDraggingInCanvas = false;
            state.boardMode = IBoardMode.SELECTION;
            state.selectedShape = null;
        },
        updateWorkspaceAction(state, action: PayloadAction<WorkspaceUpdatePayload>) {
            const workspace = state.workspaces.find((item) => item.id === action.payload.id);
            if (!workspace || !action.payload.name.trim()) {
                return;
            }

            workspace.name = action.payload.name.trim();
            workspace.description = action.payload.description.trim();
        },
        deleteWorkspaceAction(state, action: PayloadAction<WorkspaceDeletePayload>) {
            const workspaceIndex = state.workspaces.findIndex((item) => item.id === action.payload.id);
            if (workspaceIndex < 0) {
                return;
            }

            const workspace = state.workspaces[workspaceIndex];
            const targetWorkspace = action.payload.moveBoardsToWorkspaceId
                ? state.workspaces.find(
                      (item) =>
                          item.id === action.payload.moveBoardsToWorkspaceId &&
                          item.id !== workspace.id
                  )
                : undefined;

            if (targetWorkspace) {
                targetWorkspace.boards.push(...workspace.boards);
            }

            state.workspaces.splice(workspaceIndex, 1);

            if (state.activeWorkspaceId === workspace.id) {
                const nextWorkspace = targetWorkspace ?? state.workspaces[0];
                state.activeWorkspaceId = nextWorkspace?.id ?? "";
                state.activeBoardId = nextWorkspace?.boards[0]?.id ?? "";
                state.selectedBoardObject = null;
                state.draftObjectId = null;
                state.isDraggingInCanvas = false;
                state.boardMode = IBoardMode.SELECTION;
                state.selectedShape = null;
            }
        },
        switchWorkspaceAction(state, action: PayloadAction<string>) {
            const workspace = state.workspaces.find((item) => item.id === action.payload);
            if (workspace) {
                state.activeWorkspaceId = workspace.id;
                state.activeBoardId = workspace.boards[0].id;
                state.selectedBoardObject = null;
                state.draftObjectId = null;
                state.isDraggingInCanvas = false;
                state.boardMode = IBoardMode.SELECTION;
                state.selectedShape = null;
            }
        },
        createBoardAction(state) {
            const activeWorkspace = getActiveWorkspace(state);
            if (!activeWorkspace || !canCreateBoard(state)) {
                return;
            }

            const board = createBoard(`Board ${activeWorkspace.boards.length + 1}`);
            activeWorkspace.boards.push(board);
            state.activeBoardId = board.id;
            state.selectedBoardObject = null;
            state.boardMode = IBoardMode.SELECTION;
            state.selectedShape = null;
        },
        renameBoardAction(state, action: PayloadAction<{ id: string; name: string }>) {
            const activeWorkspace = getActiveWorkspace(state);
            const board = activeWorkspace?.boards.find((item) => item.id === action.payload.id);
            if (board && action.payload.name.trim()) {
                board.name = action.payload.name.trim();
            }
        },
        switchBoardAction(state, action: PayloadAction<string>) {
            const activeWorkspace = getActiveWorkspace(state);
            if (activeWorkspace?.boards.some((board) => board.id === action.payload)) {
                state.activeBoardId = action.payload;
                state.selectedBoardObject = null;
                state.draftObjectId = null;
                state.isDraggingInCanvas = false;
                state.boardMode = IBoardMode.SELECTION;
                state.selectedShape = null;
            }
        },
        toolSelected(
            state,
            action: PayloadAction<{ mode: IBoardMode; shape?: IBoardShapes }>
        ) {
            state.boardMode = action.payload.mode;
            state.selectedShape = action.payload.shape ?? null;
            state.selectedBoardObject = null;
            state.draftObjectId = null;
        },
        pointerDown(state, action: PayloadAction<PointerPayload>) {
            const board = getActiveBoard(state);
            if (!board) {
                return;
            }

            const point = action.payload;
            state.isDraggingInCanvas = true;

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

            if (state.boardMode === IBoardMode.ADD_SHAPE && state.selectedShape) {
                if (!canAddElementToBoard(board)) {
                    state.isDraggingInCanvas = false;
                    return;
                }

                const boardObject = createBoardObject(state.selectedShape, point);
                if (boardObject) {
                    board.ObjectList.push(boardObject);
                }
                state.boardMode = IBoardMode.SELECTION;
                state.selectedShape = null;
                state.isDraggingInCanvas = false;
                return;
            }

            if (state.boardMode === IBoardMode.ADD_LINE) {
                if (!canAddElementToBoard(board)) {
                    state.isDraggingInCanvas = false;
                    state.boardMode = IBoardMode.SELECTION;
                    return;
                }

                const lineObject = createBoardObject(
                    state.selectedShape === IBoardShapes.ARROW ? IBoardShapes.ARROW : IBoardShapes.LINE,
                    point
                );
                if (lineObject) {
                    board.ObjectList.push(lineObject);
                    state.draftObjectId = lineObject.id;
                }
                return;
            }

            if (state.boardMode === IBoardMode.SCRIBBLE) {
                if (!canAddElementToBoard(board)) {
                    state.isDraggingInCanvas = false;
                    state.boardMode = IBoardMode.SELECTION;
                    return;
                }

                const scribbleObject = createBoardObject(IBoardShapes.SCRIBBLE, point);
                if (scribbleObject) {
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

                const textBoxObject = createBoardObject(IBoardShapes.TEXT_BOX, point) as
                    | ITextBoxObject
                    | null;
                if (textBoxObject) {
                    board.ObjectList.push(textBoxObject);
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

            const selectedObject = findSelectedObject(board, point);
            if (!selectedObject) {
                state.selectedBoardObject = null;
                return;
            }

            state.selectedBoardObject = {
                id: selectedObject.id,
                lastX: point.x - selectedObject.x,
                lastY: point.y - selectedObject.y,
            };

            if (selectedObject.type === IBoardShapes.LINE || selectedObject.type === IBoardShapes.ARROW) {
                const lineObject = selectedObject as ILineObject;
                lineObject.draggingFromDestination = getLineDragHandle(lineObject, point);
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

            if (state.boardMode === IBoardMode.ERASER) {
                eraseObjectsAtPoint(board, point);
                state.selectedBoardObject = null;
                return;
            }

            if (state.boardMode === IBoardMode.ADD_LINE && state.draftObjectId) {
                const lineObject = board.ObjectList.find(
                    (item) => item.id === state.draftObjectId
                ) as ILineObject | undefined;
                if (lineObject) {
                    lineObject.dx = point.x - lineObject.x;
                    lineObject.dy = point.y - lineObject.y;
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
                        boardObject.type === IBoardShapes.OVAL)
                ) {
                    const rectObject = boardObject as IRectObject;
                    rectObject.width = Math.max(20, point.x - rectObject.x);
                    rectObject.height = Math.max(20, point.y - rectObject.y);
                    return;
                }

                if (
                    state.selectedBoardObject.resizeHandle === "radius" &&
                    boardObject.type === IBoardShapes.CIRCLE
                ) {
                    const circleObject = boardObject as ICircleObject;
                    circleObject.radius = Math.max(
                        10,
                        getDistanceOfPoints({ x: circleObject.x, y: circleObject.y }, point)
                    );
                    return;
                }
            }

            if (
                (boardObject.type === IBoardShapes.LINE || boardObject.type === IBoardShapes.ARROW) &&
                (boardObject as ILineObject).draggingFromDestination
            ) {
                const lineObject = boardObject as ILineObject;
                if (lineObject.draggingFromDestination === ILineVectorPoints.TERMINAL) {
                    lineObject.dx = point.x - lineObject.x;
                    lineObject.dy = point.y - lineObject.y;
                } else if (lineObject.draggingFromDestination === ILineVectorPoints.INITIAL) {
                    lineObject.dx = lineObject.x - point.x + lineObject.dx;
                    lineObject.dy = lineObject.y - point.y + lineObject.dy;
                    lineObject.x = point.x;
                    lineObject.y = point.y;
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

            boardObject.x = nextX;
            boardObject.y = nextY;
        },
        pointerUp(state) {
            state.isDraggingInCanvas = false;
            state.draftObjectId = null;
            if (state.selectedBoardObject) {
                state.selectedBoardObject.resizeHandle = undefined;
            }

            if (
                state.boardMode === IBoardMode.ADD_LINE ||
                state.boardMode === IBoardMode.SCRIBBLE
            ) {
                state.boardMode = IBoardMode.SELECTION;
            }
        },
        objectTextUpdated(state, action: PayloadAction<TextUpdatePayload>) {
            const board = getActiveBoard(state);
            const textObject = board?.ObjectList.find(
                (item) => item.id === action.payload.id && item.type === IBoardShapes.TEXT_BOX
            ) as ITextBoxObject | undefined;

            if (textObject) {
                textObject.text = action.payload.text;
                textObject.html = action.payload.html;
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

            board.ObjectList.push(...action.payload.slice(0, remainingCapacity));
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

            board.ObjectList = board.ObjectList.filter(
                (item) => item.id !== state.selectedBoardObject?.id
            );
            state.selectedBoardObject = null;
            state.draftObjectId = null;
            state.isDraggingInCanvas = false;
        },
        exportRequested(state, action: PayloadAction<ExportFormat>) {
            state.exportRequest.id += 1;
            state.exportRequest.format = action.payload;
        },
    },
});

export const {
    hydrateWhiteBoardState,
    createWorkspaceAction,
    updateWorkspaceAction,
    deleteWorkspaceAction,
    switchWorkspaceAction,
    createBoardAction,
    renameBoardAction,
    switchBoardAction,
    toolSelected,
    pointerDown,
    pointerMoved,
    pointerUp,
    objectTextUpdated,
    applyGeneratedShapes,
    deleteSelectedObjectAction,
    exportRequested,
} = WhiteBoardSlice.actions;

export default WhiteBoardSlice.reducer;
