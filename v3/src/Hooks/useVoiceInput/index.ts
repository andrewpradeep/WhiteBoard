import { useCallback, useEffect, useRef, useState } from "react";
import {
    isMicrophoneCaptureSupported,
    MicrophoneCapture,
    MIN_AUDIO_SAMPLES,
} from "../../Services/SpeechRecognition/audioCapture";
import {
    getSpeechTranscriptionErrorMessage,
    isSpeechModelLoaded,
    preloadSpeechModel,
    transcribeAudioSamples,
    type SpeechRecognitionProgress,
} from "../../Services/SpeechRecognition/localSpeech";
import {
    getWebSpeechErrorMessage,
    isWebSpeechSupported,
    WebSpeechSession,
} from "../../Services/SpeechRecognition/webSpeech";

type VoiceStatus = "idle" | "listening" | "processing";

interface UseVoiceInputOptions {
    onFinalTranscript?: (transcript: string) => void;
}

const MAX_RECORDING_MS = 15000;

const formatProcessingLabel = (progress: SpeechRecognitionProgress) => {
    if (progress.status === "transcribing") {
        return "Transcribing offline…";
    }
    if (progress.status === "ready") {
        return "Offline speech model ready";
    }
    if (typeof progress.progress === "number") {
        return `Loading offline speech model ${progress.progress}%`;
    }
    return "Loading offline speech model…";
};

const useVoiceInput = (options?: UseVoiceInputOptions) => {
    const [status, setStatus] = useState<VoiceStatus>("idle");
    const [interimTranscript, setInterimTranscript] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [processingLabel, setProcessingLabel] = useState("");
    const [isLoadingSpeechModel, setIsLoadingSpeechModel] = useState(false);
    const [isSupported] = useState(() => isWebSpeechSupported() || isMicrophoneCaptureSupported());

    const captureRef = useRef<MicrophoneCapture | null>(null);
    const webSpeechRef = useRef<WebSpeechSession | null>(null);
    const stopTimerRef = useRef<number | null>(null);
    const preferOfflineRef = useRef(true);
    const onFinalTranscriptRef = useRef(options?.onFinalTranscript);
    onFinalTranscriptRef.current = options?.onFinalTranscript;

    const clearStopTimer = useCallback(() => {
        if (stopTimerRef.current !== null) {
            window.clearTimeout(stopTimerRef.current);
            stopTimerRef.current = null;
        }
    }, []);

    const resetCapture = useCallback(() => {
        clearStopTimer();
        captureRef.current?.stop();
        captureRef.current = null;
    }, [clearStopTimer]);

    const resetWebSpeech = useCallback(() => {
        webSpeechRef.current?.stop(false);
        webSpeechRef.current = null;
    }, []);

    const ensureSpeechModelReady = useCallback(async () => {
        if (isSpeechModelLoaded()) {
            return;
        }

        setIsLoadingSpeechModel(true);
        setProcessingLabel("Loading offline speech model…");

        try {
            await preloadSpeechModel((progress) => {
                setProcessingLabel(formatProcessingLabel(progress));
            });
        } finally {
            setIsLoadingSpeechModel(false);
        }
    }, []);

    const resetVoiceSession = useCallback(() => {
        resetCapture();
        resetWebSpeech();
    }, [resetCapture, resetWebSpeech]);

    const finishOfflineRecording = useCallback(async () => {
        const capture = captureRef.current;
        if (!capture) {
            setStatus("idle");
            return;
        }

        captureRef.current = null;
        clearStopTimer();

        const samples = capture.stop();
        setStatus("processing");
        setProcessingLabel("Transcribing offline…");

        if (samples.length < MIN_AUDIO_SAMPLES) {
            setStatus("idle");
            setProcessingLabel("");
            setError("Speak for at least one second, then tap the mic again.");
            return;
        }

        try {
            const transcript = await transcribeAudioSamples(samples, (progress) => {
                if (progress.status === "loading") {
                    setIsLoadingSpeechModel(true);
                }
                setProcessingLabel(formatProcessingLabel(progress));
                if (progress.status === "ready" || progress.status === "transcribing") {
                    setIsLoadingSpeechModel(false);
                }
            });

            setInterimTranscript(transcript);

            if (transcript) {
                onFinalTranscriptRef.current?.(transcript);
            } else {
                setError("No speech detected. Tap the mic and try again.");
            }
        } catch (transcriptionError) {
            setError(getSpeechTranscriptionErrorMessage(transcriptionError));
        } finally {
            setIsLoadingSpeechModel(false);
            setStatus("idle");
            setProcessingLabel("");
        }
    }, [clearStopTimer]);

    const startOfflineRecording = useCallback(async () => {
        if (!isMicrophoneCaptureSupported()) {
            setError("Offline speech recognition is not supported in this browser.");
            setStatus("idle");
            setProcessingLabel("");
            return;
        }

        resetCapture();
        setProcessingLabel("");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            const capture = new MicrophoneCapture();
            await capture.start(stream);
            captureRef.current = capture;
            setStatus("listening");
            setProcessingLabel("Listening…");

            stopTimerRef.current = window.setTimeout(() => {
                void finishOfflineRecording();
            }, MAX_RECORDING_MS);
        } catch {
            resetCapture();
            setStatus("idle");
            setProcessingLabel("");
            setError("Microphone access was denied. Allow mic access in your browser settings.");
        }
    }, [finishOfflineRecording, resetCapture]);

    const startWebSpeech = useCallback(() => {
        resetWebSpeech();

        const session = new WebSpeechSession();
        webSpeechRef.current = session;
        setStatus("listening");
        setProcessingLabel("");

        session.start({
            onInterimTranscript: (transcript) => {
                setInterimTranscript(transcript);
            },
            onFinalTranscript: (transcript) => {
                setInterimTranscript(transcript);
                onFinalTranscriptRef.current?.(transcript);
                setStatus("idle");
            },
            onError: (errorCode) => {
                if (errorCode === "network") {
                    preferOfflineRef.current = true;
                    resetWebSpeech();
                    setProcessingLabel("Browser speech unavailable. Switching to offline mode…");
                    void ensureSpeechModelReady()
                        .then(() => startOfflineRecording())
                        .catch((loadError) => {
                            setError(getSpeechTranscriptionErrorMessage(loadError));
                            setStatus("idle");
                            setProcessingLabel("");
                        });
                    return;
                }

                setError(getWebSpeechErrorMessage(errorCode));
                setStatus("idle");
                setProcessingLabel("");
                resetWebSpeech();
            },
            onEnd: () => {
                webSpeechRef.current = null;

                if (captureRef.current) {
                    return;
                }

                setStatus((current) => (current === "listening" ? "idle" : current));
            },
        });
    }, [ensureSpeechModelReady, resetWebSpeech, startOfflineRecording]);

    const stopListening = useCallback(() => {
        if (status !== "listening") {
            resetVoiceSession();
            setStatus("idle");
            setProcessingLabel("");
            return;
        }

        if (webSpeechRef.current) {
            const transcript = webSpeechRef.current.getTranscript();
            webSpeechRef.current.stop(true);
            webSpeechRef.current = null;
            setStatus("idle");
            setProcessingLabel("");

            if (transcript) {
                setInterimTranscript(transcript);
                onFinalTranscriptRef.current?.(transcript);
            }
            return;
        }

        void finishOfflineRecording();
    }, [finishOfflineRecording, resetVoiceSession, status]);

    const startListening = useCallback(async () => {
        if (!isSupported || status === "listening" || status === "processing") {
            return;
        }

        setError(null);
        setInterimTranscript("");
        setProcessingLabel("");
        resetVoiceSession();

        if (isWebSpeechSupported() && !preferOfflineRef.current) {
            startWebSpeech();
            return;
        }

        setProcessingLabel("Preparing offline speech model…");

        try {
            await ensureSpeechModelReady();
            await startOfflineRecording();
        } catch (loadError) {
            setError(getSpeechTranscriptionErrorMessage(loadError));
            setStatus("idle");
            setProcessingLabel("");
        }
    }, [ensureSpeechModelReady, isSupported, resetVoiceSession, startOfflineRecording, startWebSpeech, status]);

    useEffect(
        () => () => {
            resetVoiceSession();
        },
        [resetVoiceSession]
    );

    return {
        status,
        interimTranscript,
        error,
        processingLabel,
        isLoadingSpeechModel,
        isSupported,
        isListening: status === "listening",
        isProcessing: status === "processing",
        startListening,
        stopListening,
        clearTranscript: () => setInterimTranscript(""),
        clearError: () => setError(null),
    };
};

export default useVoiceInput;
