import {
    Board,
    BoardMode,
    BoardObject,
    BoardShapes,
} from "../../Contracts/WhiteBoard";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface WhiteBoardState {
    boards: Board[];
    currentBoard: Board;
    selectedShape: BoardShapes | null;
    boardMode: BoardMode;
}

const initialState: WhiteBoardState = {
    boards: [],
    currentBoard: { ObjectList: [] },
    selectedShape: null,
    boardMode: BoardMode.SELECTION,
};

const WhiteBoardSlice = createSlice({
    name: "WhiteBoardStore",
    initialState,
    reducers: {
        setWhiteBoardAction(state, action: PayloadAction<BoardObject[]>) {
            return {
                ...state,
                currentBoard: {
                    ObjectList: action.payload,
                },
            };
        },
        addWhiteBoardObjectAction(state, action: PayloadAction<BoardObject>) {
            return {
                ...state,
                currentBoard: {
                    ObjectList: [
                        ...state.currentBoard.ObjectList,
                        action.payload,
                    ],
                },
            };
        },
        setSelectedShapeAction(state, action: PayloadAction<BoardShapes>) {
            return {
                ...state,
                boardMode: BoardMode.ADD_SHAPE,
                selectedShape: action.payload,
            };
        },
        resetSelectedShapeAction(state) {
            return {
                ...state,
                boardMode: BoardMode.SELECTION,
                selectedShape: null,
            };
        },
        setBoardMode(state, action: PayloadAction<BoardMode>) {
            return {
                ...state,
                boardMode: action.payload,
            };
        },
    },
});

export const {
    addWhiteBoardObjectAction,
    setSelectedShapeAction,
    resetSelectedShapeAction,
    setWhiteBoardAction,
    setBoardMode,
} = WhiteBoardSlice.actions;

export default WhiteBoardSlice.reducer;
