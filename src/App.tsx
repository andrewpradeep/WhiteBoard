import "./App.css";
import SideBar from "./Components/SideBar";
import WhiteBoard from "./Components/WhiteBoard";

function App() {
    return (
        <>
            <SideBar />
            <WhiteBoard width={2000} height={2000} className="white-board" />
        </>
    );
}

export default App;
