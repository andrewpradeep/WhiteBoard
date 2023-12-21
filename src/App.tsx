import { useState } from "react";
import "./App.css";
import SideBar from "./Components/SideBar";
import WhiteBoard from "./Components/WhiteBoard";
import { BoardShapes } from "./Components/WhiteBoard/interface";

function App() {
    const [selectedShape, setSelectedShape] = useState<BoardShapes | null>(
        null
    );
    return (
        <>
            <SideBar
                onShapeSelection={(shape) => {
                    setSelectedShape(shape);
                }}
            />
            <WhiteBoard
                width={2000}
                height={2000}
                className="white-board"
                selectedShape={selectedShape}
                onShapeAdded={() => {
                    setSelectedShape(null);
                }}
            />
        </>
    );
}

export default App;
