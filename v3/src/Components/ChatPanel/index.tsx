import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../rootReducer";
import { recordShapeBatch } from "../../Engine/DocumentStore";
import useAssistantAvailable from "../../Hooks/useAssistantAvailable";
import useVoiceInput from "../../Hooks/useVoiceInput";
import { boardToNamedDslState } from "../../Services/GeometricModel/boardToDsl";
import {
    createSimpleShapeFromCommand,
    diffGeneratedDslState,
    parseRelativeInstructions,
    ReferenceContext,
} from "../../Services/GeometricModel/diffStates";
import { dslToBoard } from "../../Services/GeometricModel/dslToBoard";
import {
    formatInferenceProgress,
    isModelLoaded,
    runInference,
} from "../../Services/GeometricModel/inference";
import { expandPattern, matchPattern } from "../../Services/GeometricModel/PatternLibrary";
import { avoidExistingShapes } from "../../Services/GeometricModel/placementAvoidance";
import {
    applyGeneratedShapes,
    getActiveBoard,
    setShowElementNames,
    toggleShowElementNames,
} from "../../Store/WhiteBoardStore";
import {
    ChatMessage,
    createChatMessage,
    createIntroMessage,
    createPlacementGuideMessage,
} from "./chatHistory";
import GuideMessageContent from "./GuideMessageContent";
import MicIcon from "./MicIcon";
import ModelConsentCard from "./ModelConsentCard";
import ModelLoadingOverlay from "./ModelLoadingOverlay";
import SpeechLoadingOverlay from "./SpeechLoadingOverlay";
import { hasModelDownloadConsent, setModelDownloadConsent } from "./modelConsent";
import "./index.css";

const buildInferencePrompt = (boardDsl: string, command: string) =>
    `state: ${boardDsl} cmd: ${command}`;

const getErrorMessage = (error: unknown) =>
    error instanceof Error && error.message
        ? error.message
        : "Something went wrong while running the model.";

const needsModelDownloadConsent = () => !isModelLoaded() && !hasModelDownloadConsent();

const ChatPanel = () => {
    const dispatch = useDispatch();
    const isAssistantAvailable = useAssistantAvailable();
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const placementGuideShownRef = useRef(false);
    const [isOpen, setIsOpen] = useState(false);
    const [draftCommand, setDraftCommand] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [inferencePhase, setInferencePhase] = useState<"idle" | "loading" | "inferencing">("idle");
    const [progressLabel, setProgressLabel] = useState("");
    const [modelConsentPending, setModelConsentPending] = useState(false);
    const [pendingInferenceCommand, setPendingInferenceCommand] = useState<string | null>(null);
    const runCommandRef = useRef<(command: string) => Promise<void>>(async () => undefined);
    const voice = useVoiceInput({
        onFinalTranscript: (transcript) => {
            void runCommandRef.current(transcript);
        },
    });
    const { activeBoard, showElementNames, viewport, canvasPixelSize, activeBoardId } = useSelector(
        (state: RootState) => ({
            activeBoard: getActiveBoard(state.WhiteBoardStore),
            showElementNames: state.WhiteBoardStore.showElementNames,
            viewport: state.WhiteBoardStore.viewport,
            canvasPixelSize: state.WhiteBoardStore.canvasPixelSize,
            activeBoardId: state.WhiteBoardStore.activeBoardId,
        })
    );
    const referenceContext = useMemo<ReferenceContext>(
        () => ({ viewport, canvasPixelSize }),
        [viewport, canvasPixelSize]
    );
    const inputsLocked =
        isRunning || modelConsentPending || voice.isProcessing || voice.isLoadingSpeechModel;
    const canSubmit = draftCommand.trim().length > 0 && !inputsLocked;

    useEffect(() => {
        dispatch(setShowElementNames(isOpen && isAssistantAvailable));
    }, [dispatch, isAssistantAvailable, isOpen]);

    useEffect(() => {
        if (!isAssistantAvailable && isOpen) {
            setIsOpen(false);
        }
    }, [isAssistantAvailable, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            placementGuideShownRef.current = false;
            return;
        }

        const nextMessages = [createIntroMessage()];
        if (activeBoard && activeBoard.ObjectList.length > 0) {
            nextMessages.push(createPlacementGuideMessage());
            placementGuideShownRef.current = true;
        } else {
            placementGuideShownRef.current = false;
        }

        setMessages(nextMessages);
        // Reset intro (and optional placement on open) only when panel opens or board switches.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- shape additions handled by the effect below
    }, [isOpen, activeBoardId]);

    useEffect(() => {
        if (!isOpen || !activeBoard || placementGuideShownRef.current) {
            return;
        }

        if (activeBoard.ObjectList.length > 0) {
            setMessages((currentMessages) => [...currentMessages, createPlacementGuideMessage()]);
            placementGuideShownRef.current = true;
        }
    }, [activeBoard, isOpen, activeBoard?.ObjectList.length]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        messagesEndRef.current?.scrollIntoView({ block: "end" });
    }, [isOpen, messages, progressLabel, voice.error, modelConsentPending, isRunning]);

    useEffect(() => {
        setDraftCommand(voice.interimTranscript);
    }, [voice.interimTranscript]);

    const appendAssistantMessage = useCallback((content: string) => {
        setMessages((currentMessages) => [
            ...currentMessages,
            createChatMessage("assistant", content),
        ]);
    }, []);

    const runInferenceFlow = useCallback(
        async (command: string) => {
            if (!activeBoard) {
                return;
            }

            const currentBoardDsl = boardToNamedDslState(activeBoard).trim();
            setIsRunning(true);
            setInferencePhase(isModelLoaded() ? "inferencing" : "loading");
            setProgressLabel("");

            try {
                const generatedDsl = await runInference(
                    buildInferencePrompt(currentBoardDsl, command),
                    (progress) => {
                        setProgressLabel(formatInferenceProgress(progress));
                        if (progress.status === "ready") {
                            setInferencePhase("inferencing");
                        }
                    }
                );
                const generatedObjects = dslToBoard(generatedDsl, activeBoard.ObjectList);
                const generatedDelta = diffGeneratedDslState(
                    activeBoard.ObjectList,
                    generatedDsl,
                    command,
                    referenceContext
                );

                if (!generatedObjects.length && !generatedDelta.length) {
                    appendAssistantMessage(
                        "I could not turn that into board shapes. Try a clearer geometric request."
                    );
                    return;
                }

                if (!generatedDelta.length) {
                    appendAssistantMessage("The model did not suggest any new shapes for this board.");
                    return;
                }

                const placedDelta = avoidExistingShapes(generatedDelta, activeBoard.ObjectList);

                dispatch(applyGeneratedShapes(placedDelta));
                recordShapeBatch(activeBoard.id, placedDelta);
                appendAssistantMessage(
                    `Added ${placedDelta.length} generated shape${placedDelta.length === 1 ? "" : "s"}.`
                );
            } catch (error) {
                appendAssistantMessage(`I could not run inference: ${getErrorMessage(error)}`);
            } finally {
                setIsRunning(false);
                setInferencePhase("idle");
                setProgressLabel("");
            }
        },
        [activeBoard, appendAssistantMessage, dispatch, referenceContext]
    );

    const runCommand = async (command: string) => {
        if (!command.trim() || isRunning || modelConsentPending) {
            return;
        }

        setMessages((currentMessages) => [
            ...currentMessages,
            createChatMessage("user", command.trim()),
        ]);
        setDraftCommand("");
        voice.clearTranscript();

        if (!activeBoard) {
            appendAssistantMessage("Open a board first, then I can help generate shapes.");
            return;
        }

        const patternId = matchPattern(command);
        if (patternId) {
            const patternShapes = avoidExistingShapes(
                expandPattern(patternId, command),
                activeBoard.ObjectList
            );
            if (patternShapes.length) {
                dispatch(applyGeneratedShapes(patternShapes));
                recordShapeBatch(activeBoard.id, patternShapes);
                appendAssistantMessage(
                    `Added ${patternShapes.length} shape${patternShapes.length === 1 ? "" : "s"} from pattern "${patternId}".`
                );
                return;
            }
        }

        const simpleShapes = avoidExistingShapes(
            createSimpleShapeFromCommand(command, activeBoard.ObjectList),
            activeBoard.ObjectList
        );
        if (simpleShapes.length) {
            dispatch(applyGeneratedShapes(simpleShapes));
            recordShapeBatch(activeBoard.id, simpleShapes);
            appendAssistantMessage(
                `Added ${simpleShapes.length} shape${simpleShapes.length === 1 ? "" : "s"}.`
            );
            return;
        }

        if (parseRelativeInstructions(command).length > 0) {
            const relativeDelta = diffGeneratedDslState(
                activeBoard.ObjectList,
                "",
                command,
                referenceContext
            );
            if (relativeDelta.length) {
                const placedDelta = avoidExistingShapes(relativeDelta, activeBoard.ObjectList);
                dispatch(applyGeneratedShapes(placedDelta));
                recordShapeBatch(activeBoard.id, placedDelta);
                appendAssistantMessage(
                    `Added ${placedDelta.length} shape${placedDelta.length === 1 ? "" : "s"}.`
                );
                return;
            }

            if (activeBoard.ObjectList.length === 0) {
                appendAssistantMessage(
                    "Add a shape first, then you can place new ones relative to it."
                );
                return;
            }
        }

        if (needsModelDownloadConsent()) {
            setPendingInferenceCommand(command);
            setModelConsentPending(true);
            return;
        }

        await runInferenceFlow(command);
    };

    runCommandRef.current = runCommand;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await runCommand(draftCommand);
    };

    const handleMicToggle = () => {
        if (!voice.isSupported || inputsLocked) {
            return;
        }

        if (voice.isListening) {
            voice.stopListening();
            return;
        }

        void voice.startListening();
    };

    const handleModelConsentConfirm = () => {
        setModelDownloadConsent();
        setModelConsentPending(false);
        const command = pendingInferenceCommand;
        setPendingInferenceCommand(null);
        if (command) {
            void runInferenceFlow(command);
        }
    };

    const handleModelConsentCancel = () => {
        setModelConsentPending(false);
        setPendingInferenceCommand(null);
        appendAssistantMessage("Model download cancelled. Pattern and placement commands still work.");
    };

    if (!isAssistantAvailable) {
        return null;
    }

    return (
        <>
            {voice.isLoadingSpeechModel && (
                <SpeechLoadingOverlay progressLabel={voice.processingLabel} />
            )}
            <aside
                aria-label="Assistant"
                className={`chat-panel ${isOpen ? "open" : "collapsed"}`}
            >
            {isOpen ? (
                <div
                    aria-busy={isRunning || modelConsentPending}
                    className="chat-window"
                    data-testid="assistant-panel"
                >
                    <header className="chat-header">
                        <strong>Assistant</strong>
                        <div className="chat-header-actions">
                            <button
                                aria-label={
                                    showElementNames
                                        ? "Hide element labels on canvas"
                                        : "Show element labels on canvas"
                                }
                                aria-pressed={showElementNames}
                                className={`chat-labels-toggle ${showElementNames ? "active" : ""}`}
                                data-testid="toggle-element-names"
                                data-tooltip={showElementNames ? "Hide labels" : "Show labels"}
                                disabled={inputsLocked}
                                onClick={() => dispatch(toggleShowElementNames())}
                                type="button"
                            >
                                Labels
                            </button>
                            <button
                                aria-label="Collapse assistant"
                                data-tooltip="Close"
                                disabled={isRunning}
                                onClick={() => setIsOpen(false)}
                                type="button"
                            >
                                ×
                            </button>
                        </div>
                    </header>
                    <div aria-live="polite" className="chat-messages">
                        {messages.map((message) => (
                            <div
                                className={`chat-message ${message.role} ${message.guide ? "guide" : ""}`}
                                key={message.id}
                            >
                                {message.guide ? (
                                    <GuideMessageContent guide={message.guide} />
                                ) : (
                                    message.content
                                )}
                            </div>
                        ))}
                        {voice.processingLabel && (
                            <div aria-live="polite" className="chat-voice-status">
                                {voice.processingLabel}
                            </div>
                        )}
                        {voice.error && (
                            <div className="chat-message assistant voice-error">{voice.error}</div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className={`chat-form ${inputsLocked ? "disabled" : ""}`} onSubmit={handleSubmit}>
                        {voice.isSupported && (
                            <button
                                aria-label={voice.isListening ? "Stop listening" : "Start voice input"}
                                className={`chat-mic ${voice.isListening ? "listening" : ""}`}
                                data-tooltip={voice.isListening ? "Stop listening" : "Voice input"}
                                disabled={inputsLocked}
                                onClick={handleMicToggle}
                                type="button"
                            >
                                <MicIcon className="chat-mic-icon" />
                            </button>
                        )}
                        <input
                            aria-label="Assistant command"
                            data-testid="assistant-input"
                            disabled={inputsLocked}
                            onChange={(event) => {
                                voice.clearError();
                                setDraftCommand(event.target.value);
                            }}
                            placeholder="Describe a shape, or tap mic to speak"
                            type="text"
                            value={draftCommand}
                        />
                        <button
                            aria-label="Send command"
                            data-tooltip="Send"
                            disabled={!canSubmit}
                            type="submit"
                        >
                            ↑
                        </button>
                    </form>
                    {modelConsentPending && (
                        <ModelConsentCard
                            onCancel={handleModelConsentCancel}
                            onConfirm={handleModelConsentConfirm}
                        />
                    )}
                    {isRunning && inferencePhase !== "idle" && (
                        <ModelLoadingOverlay
                            phase={inferencePhase === "inferencing" ? "inferencing" : "loading"}
                            progressLabel={progressLabel}
                        />
                    )}
                </div>
            ) : (
                <button
                    aria-label="Open assistant"
                    className="chat-launcher"
                    data-testid="assistant-launcher"
                    data-tooltip="Assistant"
                    onClick={() => setIsOpen(true)}
                    type="button"
                >
                    ◎
                </button>
            )}
            </aside>
        </>
    );
};

export default ChatPanel;
