import QuillEditor from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./index.css"
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../rootReducer";
import { IBoardShapes, ITextBoxObject } from "../../Contracts/WhiteBoard";
import ReactQuill from "react-quill";
import { useDispatch } from "react-redux";
import { ISelectedObjectDetail, getActiveBoard, objectTextUpdated } from "../../Store/WhiteBoardStore";



const Editor = ()=>{

    const [value, setValue] = useState("");
    const [position,setPosition] = useState({left:0,top:0});
    const [localSelectedBoardObject,setLocalSelectedBoardObject] = useState<ISelectedObjectDetail | null>(null);
    const dispatch = useDispatch();

    const  { selectedBoardObject,boardObjectList,isDragging} = useSelector((state:RootState)=>{
        const activeBoard = getActiveBoard(state.WhiteBoardStore);
        return {
            selectedBoardObject: state.WhiteBoardStore.selectedBoardObject,
            boardObjectList: activeBoard?.ObjectList || [],
            isDragging: state.WhiteBoardStore.isDraggingInCanvas
        }
    })

    const selectedBoardObjectDetail = useMemo(()=>{
        return selectedBoardObject && boardObjectList.find((item) => item.id === selectedBoardObject.id);
    },[selectedBoardObject,boardObjectList]);
    const isTextObjectSelected = selectedBoardObjectDetail && selectedBoardObjectDetail.type === IBoardShapes.TEXT_BOX;

    const editorRef = useRef<ReactQuill>(null);
    const getEditor = () => editorRef.current?.getEditor();

    useEffect(()=>{
        if(isTextObjectSelected)
        {
            const data = selectedBoardObjectDetail as ITextBoxObject;
            setLocalSelectedBoardObject(selectedBoardObject);
            const canvasBounds = document.getElementById("white_board")?.getBoundingClientRect();
            setPosition({
                top: data.y + (canvasBounds?.top ?? 0),
                left: data.x + (canvasBounds?.left ?? 0),
            });
            setValue(data.html);
        }
    },[isTextObjectSelected, selectedBoardObject,selectedBoardObjectDetail]);

    const isEditorDisabled = (!isTextObjectSelected || isDragging);

    const handleValueChange = (value:string)=>{
        setValue(value);
        // Keep canvas text current even before the editor loses focus.
        const tempEditor = getEditor();
        if(tempEditor?.root && localSelectedBoardObject)
        {
            const {width,height} = tempEditor.root.getBoundingClientRect();
            dispatch(objectTextUpdated({
                id: localSelectedBoardObject.id,
                text: tempEditor.getText(),
                html: value,
                width,
                height,
            }));
        }
    }

    const handleBlur = ()=>{
        const tempEditor = getEditor();

        if(tempEditor?.root && localSelectedBoardObject)
        {
            const {width,height} = tempEditor.root.getBoundingClientRect();
            dispatch(objectTextUpdated({
                id: localSelectedBoardObject.id,
                text: tempEditor.getText(),
                html: value,
                width,
                height,
            }));
        }
        
    }

    

    return (
        <div
            className="text-editor-shell"
            style={{top: position.top, left: position.left,minWidth:"150px", ...(isEditorDisabled ? {visibility:"hidden",zIndex:-1}:{})}}
        >
            <button
                className="text-selection-handle"
                onMouseDown={(event) => event.preventDefault()}
                type="button"
            >
                Text box selected
            </button>
            <QuillEditor id={"quill-editor"} 
                ref={editorRef}  
                value={value} 
                onChange={handleValueChange} 
                onBlur={handleBlur}
                modules={{toolbar: null}}
                formats ={[
                    "header",
                    "font",
                    "size",
                    "bold",
                    "italic",
                    "underline",
                    "strike",
                    "blockquote",
                    "color",
                ]}
                placeholder="enter text"
            />
        </div>
    )
}

export default Editor;