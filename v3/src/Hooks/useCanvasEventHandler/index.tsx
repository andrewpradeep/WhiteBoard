import { PointerEventHandler, SyntheticEvent, WheelEventHandler, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IBoardMode } from "../../Contracts/WhiteBoard";
import { RootState } from "../../rootReducer";
import { panViewport, pointerDown, pointerMoved, pointerUp, shapeDoubleClicked, zoomBy } from "../../Store/WhiteBoardStore";
import { getCanvasPixelRatio, screenToWorld } from "../../Utils/viewport";

const useCanvasEventHandler = () => {
    const dispatch = useDispatch();
    const isSpacePressedRef = useRef(false);
    const isPanningRef = useRef(false);
    const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const { boardMode, viewport } = useSelector((state: RootState) => ({
        boardMode: state.WhiteBoardStore.boardMode,
        viewport: state.WhiteBoardStore.viewport,
    }));

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code === "Space" && !event.repeat) {
                const target = event.target as HTMLElement | null;
                if (
                    target?.closest("input") ||
                    target?.closest("textarea") ||
                    target?.isContentEditable
                ) {
                    return;
                }
                isSpacePressedRef.current = true;
                setIsSpacePressed(true);
                event.preventDefault();
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === "Space") {
                isSpacePressedRef.current = false;
                setIsSpacePressed(false);
                isPanningRef.current = false;
                lastPanPointRef.current = null;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    const getCanvasPoint = (
        event: SyntheticEvent<HTMLCanvasElement, MouseEvent | PointerEvent>
    ) => {
        const canvas = event.currentTarget;
        const canvasBounds = canvas.getBoundingClientRect();
        const worldPoint = screenToWorld(
            event.nativeEvent.clientX,
            event.nativeEvent.clientY,
            canvasBounds,
            canvas.width,
            canvas.height,
            viewport
        );

        return {
            ...worldPoint,
            pixelRatio: getCanvasPixelRatio(canvas),
            clientX: event.nativeEvent.clientX,
            clientY: event.nativeEvent.clientY,
            viewportScale: viewport.scale,
        };
    };

    const handlePointerDown: PointerEventHandler<HTMLCanvasElement> = (event) => {
        if (isSpacePressedRef.current && boardMode === IBoardMode.SELECTION) {
            isPanningRef.current = true;
            lastPanPointRef.current = {
                x: event.clientX,
                y: event.clientY,
            };
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dispatch(pointerDown(getCanvasPoint(event)));
    };

    const handlePointerMove: PointerEventHandler<HTMLCanvasElement> = (event) => {
        if (isPanningRef.current && lastPanPointRef.current) {
            event.preventDefault();
            dispatch(
                panViewport({
                    dx: event.clientX - lastPanPointRef.current.x,
                    dy: event.clientY - lastPanPointRef.current.y,
                })
            );
            lastPanPointRef.current = {
                x: event.clientX,
                y: event.clientY,
            };
            return;
        }

        event.preventDefault();
        dispatch(pointerMoved(getCanvasPoint(event)));
    };

    const handlePointerUp: PointerEventHandler<HTMLCanvasElement> = (event) => {
        if (isPanningRef.current) {
            isPanningRef.current = false;
            lastPanPointRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
            return;
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dispatch(pointerUp(getCanvasPoint(event)));
    };

    const handleDoubleClick: PointerEventHandler<HTMLCanvasElement> = (event) => {
        event.preventDefault();
        dispatch(shapeDoubleClicked(getCanvasPoint(event)));
    };

    const handleWheel: WheelEventHandler<HTMLCanvasElement> = (event) => {
        if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            dispatch(zoomBy(event.deltaY > 0 ? -0.08 : 0.08));
            return;
        }

        if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
            event.preventDefault();
            dispatch(
                panViewport({
                    dx: -event.deltaX,
                    dy: -event.deltaY,
                })
            );
        }
    };

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleDoubleClick,
        handleWheel,
        isSpacePressed,
    };
};

export default useCanvasEventHandler;
