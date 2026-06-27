import { useEffect, useState } from "react";

export const DESKTOP_MEDIA_QUERY = "(min-width: 901px)";

const getIsDesktop = () => {
    if (typeof window === "undefined") {
        return false;
    }

    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
};

const useIsDesktop = () => {
    const [isDesktop, setIsDesktop] = useState(getIsDesktop);

    useEffect(() => {
        const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
        const handleChange = () => setIsDesktop(mediaQuery.matches);

        handleChange();
        mediaQuery.addEventListener("change", handleChange);

        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    return isDesktop;
};

export default useIsDesktop;
