import { IconProps } from "./interface";
import "./index.css";

const Icon: React.FC<IconProps> = ({ className = "", srcUrl }) => {
    return (
        <div className={`wb-logo-container ${className}`}>
            <img src={srcUrl}></img>
        </div>
    );
};

export default Icon;
