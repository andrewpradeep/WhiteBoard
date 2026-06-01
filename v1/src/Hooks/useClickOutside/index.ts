import { useEffect } from "react";

const useClickOutside = (
    ref: React.RefObject<HTMLElement>,
    handler: (event: MouseEvent) => void
) => {
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref?.current && !ref.current.contains(event.target as Node)) {
                handler(event);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref]);
};

export default useClickOutside;
