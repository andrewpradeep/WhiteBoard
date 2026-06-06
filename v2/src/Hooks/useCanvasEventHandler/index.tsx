import { PointerEventHandler, SyntheticEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IBoardMode } from "../../Contracts/WhiteBoard";
import { RootState } from "../../rootReducer";
import { pointerDown, pointerMoved, pointerUp } from "../../Store/WhiteBoardStore";


const useCanvasEventHandler = ()=>{

    const dispatch = useDispatch();
    const { boardMode, selectedBoardObject } = useSelector((state: RootState) => ({
        boardMode: state.WhiteBoardStore.boardMode,
        selectedBoardObject: state.WhiteBoardStore.selectedBoardObject,
    }));
    const shouldCapturePointer =
        boardMode !== IBoardMode.SELECTION || selectedBoardObject !== null;

    const getCanvasPoint = (
        event: SyntheticEvent<HTMLCanvasElement, MouseEvent | PointerEvent>
    ) => {
        const canvasBounds = event.currentTarget.getBoundingClientRect();
        const scaleX = event.currentTarget.width / canvasBounds.width;
        const scaleY = event.currentTarget.height / canvasBounds.height;

        return {
            x: (event.nativeEvent.clientX - canvasBounds.left) * scaleX,
            y: (event.nativeEvent.clientY - canvasBounds.top) * scaleY,
        };
    };

    const handlePointerDown: PointerEventHandler<HTMLCanvasElement> = (event) => {
        if (shouldCapturePointer) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        dispatch(pointerDown(getCanvasPoint(event)));
    };

    const handlePointerMove: PointerEventHandler<HTMLCanvasElement> = (event) => {
        if (shouldCapturePointer) {
            event.preventDefault();
        }
        dispatch(pointerMoved(getCanvasPoint(event)));
    };

    const handlePointerUp: PointerEventHandler<HTMLCanvasElement> = (event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dispatch(pointerUp());
    };

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    }
    
}


export default useCanvasEventHandler;