import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useIsDesktop from "../../Hooks/useIsDesktop";
import { RootState } from "../../rootReducer";
import { boardToDsl } from "../../Services/GeometricModel/boardToDsl";
import { diffGeneratedDslState } from "../../Services/GeometricModel/diffStates";
import { dslToBoard } from "../../Services/GeometricModel/dslToBoard";
import {
    InferenceProgress,
    runInference,
} from "../../Services/GeometricModel/inference";
import {
    applyGeneratedShapes,
    getActiveBoard,
    MAX_ELEMENTS_PER_BOARD,
} from "../../Store/WhiteBoardStore";
import {
    ChatMessage,
    clearChatHistory,
    createChatMessage,
    createWelcomeMessage,
    loadChatHistory,
    saveChatHistory,
} from "./chatHistory";
import "./index.css";

const MIN_CONTEXT_OBJECTS = 1;

const buildInferencePrompt = (boardDsl: string, command: string) => {
    return `state: ${boardDsl} cmd: ${command}`;
};

const formatProgress = (progress: InferenceProgress) => {
    if (typeof progress.progress === "number") {
        return `Loading model ${progress.progress}%`;
    }

    if (progress.status === "ready") {
        return "Model ready";
    }

    return "Loading model";
};

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "Something went wrong while running the model.";
};

const ChatPanel = () => {
    const isDesktop = useIsDesktop();
    const dispatch = useDispatch();
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [draftCommand, setDraftCommand] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage()]);
    const [historyBoardId, setHistoryBoardId] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [progressLabel, setProgressLabel] = useState("");
    const [loadProgress, setLoadProgress] = useState(0);
    const activeBoard = useSelector((state: RootState) => getActiveBoard(state.WhiteBoardStore));
    const activeBoardId = activeBoard?.id ?? "";
    const activeBoardObjectCount = activeBoard?.ObjectList.length ?? 0;
    const canSubmit = draftCommand.trim().length > 0 && !isRunning;

    const contextDescription = useMemo(() => {
        if (!activeBoard) {
            return "No active board";
        }

        return `${activeBoard.name} - ${activeBoardObjectCount}/${MAX_ELEMENTS_PER_BOARD} objects`;
    }, [activeBoard, activeBoardObjectCount]);

    useEffect(() => {
        if (!isDesktop || !activeBoardId) {
            return;
        }

        setMessages(loadChatHistory(activeBoardId));
        setHistoryBoardId(activeBoardId);
    }, [activeBoardId, isDesktop]);

    useEffect(() => {
        if (!isDesktop || !activeBoardId || historyBoardId !== activeBoardId) {
            return;
        }

        saveChatHistory(activeBoardId, messages);
    }, [activeBoardId, historyBoardId, isDesktop, messages]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        messagesEndRef.current?.scrollIntoView({ block: "end" });
    }, [isOpen, messages]);

    if (!isDesktop) {
        return null;
    }

    const appendAssistantMessage = (content: string) => {
        setMessages((currentMessages) => [...currentMessages, createChatMessage("assistant", content)]);
    };

    const handleClearHistory = () => {
        if (!activeBoardId || isRunning) {
            return;
        }

        setMessages(clearChatHistory(activeBoardId));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const command = draftCommand.trim();
        if (!command || isRunning) {
            return;
        }

        const userMessage = createChatMessage("user", command);
        setMessages((currentMessages) => [...currentMessages, userMessage]);
        setDraftCommand("");

        if (!activeBoard) {
            appendAssistantMessage("Open a board first, then I can help generate shapes.");
            return;
        }

        if (activeBoard.ObjectList.length < MIN_CONTEXT_OBJECTS) {
            appendAssistantMessage(
                "Add at least one basic shape to the board first so the model has enough geometric context."
            );
            return;
        }

        const currentBoardDsl = boardToDsl(activeBoard.ObjectList).trim();
        if (!currentBoardDsl) {
            appendAssistantMessage(
                "I can only read basic geometric shapes right now. Add a rectangle, circle, triangle, or line before asking me to extend the board."
            );
            return;
        }

        setIsRunning(true);
        setProgressLabel("");
        setLoadProgress(0);

        try {
            const generatedDsl = await runInference(
                buildInferencePrompt(currentBoardDsl, command),
                (progress) => {
                    setProgressLabel(formatProgress(progress));
                    if (typeof progress.progress === "number") {
                        setLoadProgress(progress.progress);
                    }
                }
            );
            const generatedObjects = dslToBoard(generatedDsl);
            const generatedDelta = diffGeneratedDslState(activeBoard.ObjectList, generatedDsl, command);

            if (!generatedObjects.length && !generatedDelta.length) {
                appendAssistantMessage(
                    "I could not turn the model response into board shapes. Try a more specific geometric request."
                );
                return;
            }

            if (!generatedDelta.length) {
                appendAssistantMessage("The model did not suggest any new shapes for this board.");
                return;
            }

            dispatch(applyGeneratedShapes(generatedDelta));
            appendAssistantMessage(`Added ${generatedDelta.length} generated shape${generatedDelta.length === 1 ? "" : "s"} to the board.`);
        } catch (error) {
            appendAssistantMessage(`I could not run inference: ${getErrorMessage(error)}`);
        } finally {
            setIsRunning(false);
            setProgressLabel("");
            setLoadProgress(0);
        }
    };

    return (
        <aside className={`chat-panel ${isOpen ? "open" : "collapsed"}`} aria-label="Geometric model chat">
            {isOpen ? (
                <div className="chat-window">
                    <header className="chat-header">
                        <div>
                            <strong>Geometric Chat</strong>
                            <span>{contextDescription}</span>
                        </div>
                        <div className="chat-header-actions">
                            <button
                                disabled={isRunning}
                                onClick={handleClearHistory}
                                title="Clear chat history"
                                type="button"
                            >
                                Clear
                            </button>
                            <button
                                aria-label="Collapse chat"
                                onClick={() => setIsOpen(false)}
                                type="button"
                            >
                                -
                            </button>
                        </div>
                    </header>
                    <div className="chat-messages">
                        {messages.map((message) => (
                            <div className={`chat-message ${message.role}`} key={message.id}>
                                {message.content}
                            </div>
                        ))}
                        {isRunning && (
                            <div className="chat-message assistant pending">
                                {progressLabel || "Generating shapes..."}
                                <div
                                    aria-label="Model loading progress"
                                    aria-valuemax={100}
                                    aria-valuemin={0}
                                    aria-valuenow={loadProgress}
                                    className="chat-progress"
                                    role="progressbar"
                                >
                                    <span style={{ width: `${Math.max(loadProgress, 8)}%` }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="chat-form" onSubmit={handleSubmit}>
                        <textarea
                            aria-label="Chat command"
                            disabled={isRunning}
                            onChange={(event) => setDraftCommand(event.target.value)}
                            placeholder="Example: add a triangle above the circle"
                            rows={3}
                            value={draftCommand}
                        />
                        <button disabled={!canSubmit} type="submit">
                            {isRunning ? "Working..." : "Send"}
                        </button>
                    </form>
                </div>
            ) : (
                <button
                    aria-label="Open geometric chat"
                    className="chat-launcher"
                    onClick={() => setIsOpen(true)}
                    type="button"
                >
                    Chat
                </button>
            )}
        </aside>
    );
};

export default ChatPanel;
