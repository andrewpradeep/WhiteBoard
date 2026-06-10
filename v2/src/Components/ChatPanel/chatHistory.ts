export type ChatRole = "assistant" | "user" | "system";

export interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
    createdAt: number;
}

const STORAGE_KEY_PREFIX = "creamboard-chat-history";

export const createChatMessage = (role: ChatRole, content: string): ChatMessage => ({
    id: `chat-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
    role,
    content,
    createdAt: Date.now(),
});

export const createWelcomeMessage = () =>
    createChatMessage(
        "assistant",
        "Hi, I can help extend this board from your current geometric layout. Draw a few shapes, then tell me what to add."
    );

const getBoardHistoryKey = (boardId: string) => `${STORAGE_KEY_PREFIX}:${boardId}`;

const isChatMessage = (value: unknown): value is ChatMessage => {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as ChatMessage;
    return (
        typeof candidate.id === "string" &&
        typeof candidate.content === "string" &&
        typeof candidate.createdAt === "number" &&
        (candidate.role === "assistant" || candidate.role === "user" || candidate.role === "system")
    );
};

export const loadChatHistory = (boardId: string): ChatMessage[] => {
    const serializedHistory = window.localStorage.getItem(getBoardHistoryKey(boardId));
    if (!serializedHistory) {
        return [createWelcomeMessage()];
    }

    try {
        const parsedHistory = JSON.parse(serializedHistory);
        if (Array.isArray(parsedHistory) && parsedHistory.every(isChatMessage)) {
            return parsedHistory.length ? parsedHistory : [createWelcomeMessage()];
        }
    } catch {
        return [createWelcomeMessage()];
    }

    return [createWelcomeMessage()];
};

export const saveChatHistory = (boardId: string, messages: ChatMessage[]) => {
    window.localStorage.setItem(getBoardHistoryKey(boardId), JSON.stringify(messages));
};

export const clearChatHistory = (boardId: string) => {
    window.localStorage.removeItem(getBoardHistoryKey(boardId));
    return [createWelcomeMessage()];
};
