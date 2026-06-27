interface SpeechRecognitionResultLike {
    isFinal: boolean;
    0: { transcript: string };
}

interface SpeechRecognitionEventLike {
    results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
    error: string;
}

interface SpeechRecognitionLike {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type WebSpeechCallbacks = {
    onInterimTranscript: (transcript: string) => void;
    onFinalTranscript: (transcript: string) => void;
    onError: (errorCode: string) => void;
    onEnd: () => void;
};

export const isWebSpeechSupported = () => getSpeechRecognitionConstructor() !== null;

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
    if (typeof window === "undefined") {
        return null;
    }

    const windowWithSpeech = window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    return windowWithSpeech.SpeechRecognition ?? windowWithSpeech.webkitSpeechRecognition ?? null;
};

export class WebSpeechSession {
    private recognition: SpeechRecognitionLike | null = null;
    private manualStop = false;
    private transcript = "";

    start(callbacks: WebSpeechCallbacks) {
        const SpeechRecognition = getSpeechRecognitionConstructor();
        if (!SpeechRecognition) {
            throw new Error("unsupported");
        }

        this.stop(false);
        this.manualStop = false;
        this.transcript = "";

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
            this.transcript = Array.from(event.results)
                .map((result) => result[0].transcript)
                .join(" ")
                .trim();
            callbacks.onInterimTranscript(this.transcript);
        };

        recognition.onerror = (event) => {
            if (event.error === "aborted") {
                return;
            }
            callbacks.onError(event.error);
        };

        recognition.onend = () => {
            const finalTranscript = this.transcript.trim();
            if (!this.manualStop && finalTranscript) {
                callbacks.onFinalTranscript(finalTranscript);
            }
            callbacks.onEnd();
            this.recognition = null;
        };

        this.recognition = recognition;
        recognition.start();
    }

    stop(manualStop = true) {
        this.manualStop = manualStop;
        if (!this.recognition) {
            return;
        }

        try {
            this.recognition.stop();
        } catch {
            this.recognition = null;
        }
    }

    getTranscript() {
        return this.transcript.trim();
    }
}

export const getWebSpeechErrorMessage = (errorCode: string) => {
    if (errorCode === "not-allowed") {
        return "Microphone access was denied. Allow mic access in your browser settings.";
    }
    if (errorCode === "no-speech") {
        return "No speech detected. Tap the mic and try again.";
    }
    if (errorCode === "network") {
        return "network";
    }
    return "Voice input failed. Tap the mic to try again.";
};
