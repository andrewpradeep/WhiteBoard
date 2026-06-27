import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./index.css";
import { RootState } from "../../rootReducer";
import { IBoardShapes, IRectObject } from "../../Contracts/WhiteBoard";
import {
    endShapeTextEdit,
    getActiveBoard,
    objectTextUpdated,
} from "../../Store/WhiteBoardStore";
import { getShapeText, getShapeTextBounds, supportsShapeText } from "../../Utils/shapeText";
import { worldToScreen } from "../../Utils/viewport";

const Editor = () => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dispatch = useDispatch();
    const { selectedBoardObject, boardObjectList, isDragging, viewport, shapeTextEditId } =
        useSelector((state: RootState) => {
            const activeBoard = getActiveBoard(state.WhiteBoardStore);
            return {
                selectedBoardObject: state.WhiteBoardStore.selectedBoardObject,
                boardObjectList: activeBoard?.ObjectList || [],
                isDragging: state.WhiteBoardStore.isDraggingInCanvas,
                viewport: state.WhiteBoardStore.viewport,
                shapeTextEditId: state.WhiteBoardStore.shapeTextEditId,
            };
        });

    const selectedBoardObjectDetail = useMemo(() => {
        return (
            selectedBoardObject &&
            boardObjectList.find((item) => item.id === selectedBoardObject.id)
        );
    }, [selectedBoardObject, boardObjectList]);

    const isTextBoxSelected = selectedBoardObjectDetail?.type === IBoardShapes.TEXT_BOX;
    const isInlineShapeTextEditing =
        !!selectedBoardObjectDetail &&
        !!shapeTextEditId &&
        selectedBoardObjectDetail.id === shapeTextEditId;
    const isTextEditing =
        !!selectedBoardObjectDetail &&
        supportsShapeText(selectedBoardObjectDetail.type) &&
        (isTextBoxSelected || isInlineShapeTextEditing);

    const textBounds = selectedBoardObjectDetail
        ? getShapeTextBounds(selectedBoardObjectDetail)
        : null;

    const updateEditorPosition = useCallback(() => {
        if (!isTextEditing || !selectedBoardObjectDetail || !textBounds) {
            return;
        }

        const canvas = document.getElementById("white_board") as HTMLCanvasElement | null;
        const canvasBounds = canvas?.getBoundingClientRect();

        if (!canvas || !canvasBounds || !textareaRef.current) {
            return;
        }

        const topLeft = worldToScreen(
            textBounds.x,
            textBounds.y,
            canvasBounds,
            canvas.width,
            canvas.height,
            viewport
        );
        const bottomRight = worldToScreen(
            textBounds.x + textBounds.width,
            textBounds.y + textBounds.height,
            canvasBounds,
            canvas.width,
            canvas.height,
            viewport
        );
        const scaleY = canvasBounds.height / canvas.height;

        textareaRef.current.style.top = `${topLeft.top}px`;
        textareaRef.current.style.left = `${topLeft.left}px`;
        textareaRef.current.style.width = `${Math.max(24, bottomRight.left - topLeft.left)}px`;
        textareaRef.current.style.height = `${Math.max(24, bottomRight.top - topLeft.top)}px`;
        textareaRef.current.style.fontSize = `${Math.max(10, Math.min(16, textBounds.height / 4)) * viewport.scale * scaleY}px`;
    }, [isTextEditing, selectedBoardObjectDetail, textBounds, viewport]);

    useEffect(() => {
        if (!isTextEditing || !selectedBoardObjectDetail || !textareaRef.current) {
            return;
        }

        textareaRef.current.value = getShapeText(selectedBoardObjectDetail);
        updateEditorPosition();
        textareaRef.current.focus();
    }, [isTextEditing, selectedBoardObjectDetail, updateEditorPosition]);

    useEffect(() => {
        if (!isTextEditing) {
            return;
        }

        window.addEventListener("scroll", updateEditorPosition, { capture: true, passive: true });
        window.addEventListener("resize", updateEditorPosition);

        return () => {
            window.removeEventListener("scroll", updateEditorPosition, { capture: true });
            window.removeEventListener("resize", updateEditorPosition);
        };
    }, [isTextEditing, updateEditorPosition]);

    const handleChange = (value: string) => {
        if (!selectedBoardObject || !textareaRef.current || !selectedBoardObjectDetail) {
            return;
        }

        if (selectedBoardObjectDetail.type === IBoardShapes.TEXT_BOX) {
            const textBoxObject = selectedBoardObjectDetail as IRectObject;
            const lines = value.split("\n");
            const width = Math.max(120, textareaRef.current.offsetWidth);
            const height = Math.max(36, lines.length * 22 + 12);

            dispatch(
                objectTextUpdated({
                    id: selectedBoardObject.id,
                    text: value,
                    width: Math.max(width, textBoxObject.width),
                    height: Math.max(height, textBoxObject.height),
                })
            );
            return;
        }

        dispatch(
            objectTextUpdated({
                id: selectedBoardObject.id,
                text: value,
            })
        );
    };

    if (!isTextEditing || isDragging || !textBounds) {
        return null;
    }

    return (
        <textarea
            ref={textareaRef}
            aria-label="Text box editor"
            className={`text-editor-input ${isInlineShapeTextEditing ? "text-editor-input--clipped" : ""}`}
            onBlur={() => dispatch(endShapeTextEdit())}
            onChange={(event) => handleChange(event.target.value)}
            placeholder="Type here"
        />
    );
};

export default Editor;
