import { combineReducers } from "redux";
import WhiteBoardStore from "./Store/WhiteBoardStore";

const rootReducer = combineReducers({ WhiteBoardStore });

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
