import Icon from "../Icon";
import "./index.css";
import SquareLogo from "../../assets/utility/shapes.svg";

const SideBar = () => {
    return (
        <div className="side-bar">
            <span className="icon-container">
                <Icon srcUrl={SquareLogo} className="side-bar-icon" />
            </span>
        </div>
    );
};

export default SideBar;
