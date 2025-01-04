import {
    IBoard,
    IBoardMode,
    IBoardObject,
    IBoardShapes,
} from "../../Contracts/WhiteBoard";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ISelectedObjectDetail {
    lastX: number;
    lastY: number;
    position: number;
}

export interface WhiteBoardState {
    boards: IBoard[];
    currentBoard: IBoard;
    selectedShape: IBoardShapes | null;
    boardMode: IBoardMode;
    selectedBoardObject: ISelectedObjectDetail | null;
    isDraggingInCanvas: boolean;
}



const initialState: WhiteBoardState = {
    boards: [],
    currentBoard: { ObjectList: [] },
    selectedShape: null,
    boardMode: IBoardMode.SELECTION,
    selectedBoardObject: null,
    isDraggingInCanvas: true
};

const WhiteBoardSlice = createSlice({
    name: "WhiteBoardStore",
    initialState,
    reducers: {
        setWhiteBoardAction(state, action: PayloadAction<IBoardObject[]>) {
            return {
                ...state,
                currentBoard: {
                    ObjectList: action.payload,
                },
            };
        },
        addWhiteBoardObjectAction(state, action: PayloadAction<IBoardObject>) {
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
        setSelectedShapeAction(state, action: PayloadAction<IBoardShapes>) {
            return {
                ...state,
                boardMode: IBoardMode.ADD_SHAPE,
                selectedShape: action.payload,
            };
        },
        resetSelectedShapeAction(state) {
            return {
                ...state,
                boardMode: IBoardMode.SELECTION,
                selectedShape: null,
            };
        },
        setBoardMode(state, action: PayloadAction<IBoardMode>) {
            return {
                ...state,
                boardMode: action.payload,
            };
        },
        resetBoardMode(state) {
            return {
                ...state,
                boardMode: IBoardMode.SELECTION,
            };
        },
        setSelectedBoardObjectAction(state,action:PayloadAction<ISelectedObjectDetail>){
            return {
                ...state,
                selectedBoardObject: action.payload
            }
        },
        clearSelectedBoardObjectAction(state){
            return {
                ...state,
                selectedBoardObject: null
            }
        },
        setIsDraggingInCanvas(state,action:PayloadAction<boolean>){
            return {
                ...state,
                isDraggingInCanvas: action.payload
            }
        }
    },
});

export const {
    addWhiteBoardObjectAction,
    setSelectedShapeAction,
    resetSelectedShapeAction,
    setWhiteBoardAction,
    setBoardMode,
    setIsDraggingInCanvas,
    setSelectedBoardObjectAction,
    clearSelectedBoardObjectAction,
    resetBoardMode
    
} = WhiteBoardSlice.actions;

export default WhiteBoardSlice.reducer;
