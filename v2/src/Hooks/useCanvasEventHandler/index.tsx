import { MouseEventHandler, SyntheticEvent } from "react";
import { useDispatch } from "react-redux";
import { pointerDown, pointerMoved, pointerUp } from "../../Store/WhiteBoardStore";


const useCanvasEventHandler = ()=>{

    const dispatch = useDispatch();

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

    const handleMouseDown: MouseEventHandler<HTMLCanvasElement> = (event) => {
        event.preventDefault();
        dispatch(pointerDown(getCanvasPoint(event)));
    };

    const handleMouseMove: MouseEventHandler<HTMLCanvasElement> = (event) => {
        event.preventDefault();
        dispatch(pointerMoved(getCanvasPoint(event)));
    };

    const handleMouseUp = () => {
        dispatch(pointerUp());
    };

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
    }
    
}


export default useCanvasEventHandler;