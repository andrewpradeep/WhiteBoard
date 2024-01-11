import { BoardShapes } from "../../../../Contracts/WhiteBoard";

export interface ShapeListProps {
    clickOutside: () => void;
    onSelection: (shape: BoardShapes) => void;
}
