import { IBoard, IWhiteboardDocument } from "../../Contracts/WhiteBoard";

const DB_NAME = "creamboard-v3";
const STORE_NAME = "whiteboard-state";
const DURABLE_STATE_KEY = "current";
const DB_VERSION = 1;

interface LegacyWorkspaceState {
    workspaces: Array<{
        id: string;
        name: string;
        description?: string;
        boards: IBoard[];
    }>;
    activeWorkspaceId: string;
    activeBoardId: string;
}

export type DurableWhiteBoardState = IWhiteboardDocument;

const createId = (prefix: string) =>
    `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;

export const createDefaultDocument = (): DurableWhiteBoardState => {
    const board: IBoard = {
        id: createId("board"),
        name: "Board 1",
        ObjectList: [],
    };

    return {
        boards: [board],
        activeBoardId: board.id,
        version: 1,
    };
};

const migrateLegacyState = (legacy: LegacyWorkspaceState): DurableWhiteBoardState => {
    const boards: IBoard[] = [];
    const seenBoardIds = new Set<string>();

    legacy.workspaces.forEach((workspace) => {
        workspace.boards.forEach((board) => {
            if (!seenBoardIds.has(board.id)) {
                seenBoardIds.add(board.id);
                boards.push(board);
            }
        });
    });

    if (!boards.length) {
        return createDefaultDocument();
    }

    const activeBoardId =
        boards.find((board) => board.id === legacy.activeBoardId)?.id ?? boards[0].id;

    return {
        boards,
        activeBoardId,
        version: 1,
    };
};

const normalizeDocument = (value: unknown): DurableWhiteBoardState | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;

    if (Array.isArray(record.boards)) {
        const boards = record.boards as IBoard[];
        if (!boards.length) {
            return null;
        }

        return {
            boards,
            activeBoardId:
                typeof record.activeBoardId === "string" &&
                boards.some((board) => board.id === record.activeBoardId)
                    ? record.activeBoardId
                    : boards[0].id,
            version: typeof record.version === "number" ? record.version : 1,
        };
    }

    if (Array.isArray(record.workspaces)) {
        return migrateLegacyState(record as unknown as LegacyWorkspaceState);
    }

    return null;
};

const openDatabase = () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const readLegacyState = async (): Promise<DurableWhiteBoardState | null> => {
    return new Promise((resolve) => {
        const request = indexedDB.open("creamboard-v2", 1);

        request.onerror = () => resolve(null);
        request.onsuccess = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains("whiteboard-state")) {
                database.close();
                resolve(null);
                return;
            }

            const transaction = database.transaction("whiteboard-state", "readonly");
            const store = transaction.objectStore("whiteboard-state");
            const getRequest = store.get("current");

            getRequest.onsuccess = () => {
                resolve(normalizeDocument(getRequest.result));
            };
            getRequest.onerror = () => resolve(null);
            transaction.oncomplete = () => database.close();
        };
    });
};

export const loadWhiteBoardState = async () => {
    try {
        const database = await openDatabase();

        const currentState = await new Promise<DurableWhiteBoardState | null>((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(DURABLE_STATE_KEY);

            request.onsuccess = () => {
                resolve(normalizeDocument(request.result));
            };
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => database.close();
        });

        if (currentState) {
            return currentState;
        }
    } catch {
        // Fall through to legacy migration.
    }

    return readLegacyState();
};

export const saveWhiteBoardState = async (state: DurableWhiteBoardState) => {
    const database = await openDatabase();

    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(state, DURABLE_STATE_KEY);

        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => {
            database.close();
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
};
