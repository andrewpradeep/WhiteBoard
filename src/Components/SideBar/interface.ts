import { BoardShapes } from "../../Contracts/WhiteBoard";

export interface SideBarProps {
    onShapeSelection: (shape: BoardShapes) => void;
}
