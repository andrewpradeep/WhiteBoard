export const ASSISTANT_OPENED_STORAGE_KEY = "whiteboard.assistantOpened.v1";

export const hasOpenedAssistant = () => {
    try {
        return localStorage.getItem(ASSISTANT_OPENED_STORAGE_KEY) === "true";
    } catch {
        return false;
    }
};

export const markAssistantOpened = () => {
    try {
        localStorage.setItem(ASSISTANT_OPENED_STORAGE_KEY, "true");
    } catch {
        // Ignore storage failures in restricted environments.
    }
};
