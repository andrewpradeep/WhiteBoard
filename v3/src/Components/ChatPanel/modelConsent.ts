export const MODEL_BUNDLE_SIZE_LABEL = "~73 MB";
export const MODEL_CONSENT_STORAGE_KEY = "whiteboard.modelConsent.v1";

export const hasModelDownloadConsent = () => {
    try {
        return sessionStorage.getItem(MODEL_CONSENT_STORAGE_KEY) === "true";
    } catch {
        return false;
    }
};

export const setModelDownloadConsent = () => {
    try {
        sessionStorage.setItem(MODEL_CONSENT_STORAGE_KEY, "true");
    } catch {
        // Ignore storage failures in restricted environments.
    }
};

export const clearModelDownloadConsent = () => {
    try {
        sessionStorage.removeItem(MODEL_CONSENT_STORAGE_KEY);
    } catch {
        // Ignore storage failures in restricted environments.
    }
};
