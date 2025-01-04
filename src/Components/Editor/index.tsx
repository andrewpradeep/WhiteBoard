import QuillEditor from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./index.css"
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../rootReducer";
import { IBoardShapes, ITextBoxObject } from "../../Contracts/WhiteBoard";
import ReactQuill from "react-quill";
import { useDispatch } from "react-redux";
import { ISelectedObjectDetail, setWhiteBoardAction } from "../../Store/WhiteBoardStore";



const Editor = ()=>{

    const [value, setValue] = useState("");
    const [position,setPosition] = useState({left:0,top:0});
    const [localSelectedBoardObject,setLocalSelectedBoardObject] = useState<ISelectedObjectDetail | null>(null);
    const dispatch = useDispatch();

    const  { selectedBoardObject,boardObjectList,isDragging} = useSelector((state:RootState)=>{
        return {
            selectedBoardObject: state.WhiteBoardStore.selectedBoardObject,
            boardObjectList: state.WhiteBoardStore.currentBoard.ObjectList,
            isDragging: state.WhiteBoardStore.isDraggingInCanvas
        }
    })

    const selectedBoardObjectDetail = useMemo(()=>{
        return selectedBoardObject && boardObjectList[selectedBoardObject?.position]},[selectedBoardObject,boardObjectList]);
    const isTextObjectSelected = selectedBoardObjectDetail && selectedBoardObjectDetail.type === IBoardShapes.TEXT_BOX;

    const editorRef = useRef<ReactQuill>(null);

    useEffect(()=>{
        if(isTextObjectSelected)
        {
            const data = selectedBoardObjectDetail as ITextBoxObject;
            setLocalSelectedBoardObject(selectedBoardObject);
            setPosition({top: data.y,left:data.x});
            setValue(data.html);
        }
    },[isTextObjectSelected, selectedBoardObject,selectedBoardObjectDetail]);

    const isEditorDisabled = (!isTextObjectSelected || isDragging);

    useEffect(()=>{
        if(!isEditorDisabled)
        {
            editorRef.current?.editor?.focus();
        }

    },[isEditorDisabled])

    const handleValueChange = (value:string)=>{
        setValue(value);    
    }

    const handleBlur = ()=>{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tempEditor:any = editorRef.current?.editor;

        if(tempEditor?.container && localSelectedBoardObject)
        {
            const tempSelectedBoardObject =  boardObjectList[localSelectedBoardObject?.position]
            const {width,height} = (tempEditor.container as HTMLDivElement).getBoundingClientRect();
            const tempObject  = {...tempSelectedBoardObject,...{width,height}} as ITextBoxObject;
            tempObject.text = tempEditor.getText();
            tempObject.html = value;
            const tempBoardList = [...boardObjectList];
            tempBoardList.splice(localSelectedBoardObject?.position,1,tempObject)
            dispatch(setWhiteBoardAction(tempBoardList));

        }
        
    }

    

    return (
        <QuillEditor id={"quill-editor"} 
            ref={editorRef}  
            value={value} 
            onChange={handleValueChange} 
            onBlur={handleBlur}
            style={{top: position.top, left: position.left,minWidth:"150px", ...(isEditorDisabled ? {visibility:"hidden",zIndex:-1}:{})}}
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
    )
}

export default Editor;