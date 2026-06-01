import { IBoardShapes } from "../../../../Contracts/WhiteBoard";

export interface IShapeListProps {
    clickOutside: () => void;
    onSelection: (shape: IBoardShapes) => void;
}
