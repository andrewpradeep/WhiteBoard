import { useEffect, useState } from "react";

/** Phones below 768px hide the assistant; iPad/tablet and desktop keep it. */
export const ASSISTANT_MEDIA_QUERY = "(min-width: 768px)";

const getIsAssistantAvailable = () => {
    if (typeof window === "undefined") {
        return false;
    }

    return window.matchMedia(ASSISTANT_MEDIA_QUERY).matches;
};

const useAssistantAvailable = () => {
    const [isAssistantAvailable, setIsAssistantAvailable] = useState(getIsAssistantAvailable);

    useEffect(() => {
        const mediaQuery = window.matchMedia(ASSISTANT_MEDIA_QUERY);
        const handleChange = () => setIsAssistantAvailable(mediaQuery.matches);

        handleChange();
        mediaQuery.addEventListener("change", handleChange);

        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    return isAssistantAvailable;
};

export default useAssistantAvailable;
