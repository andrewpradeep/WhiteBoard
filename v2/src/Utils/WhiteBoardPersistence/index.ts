import { IWorkspace } from "../../Contracts/WhiteBoard";

const DB_NAME = "creamboard-v2";
const STORE_NAME = "whiteboard-state";
const DURABLE_STATE_KEY = "current";
const DB_VERSION = 1;

export interface DurableWhiteBoardState {
    workspaces: IWorkspace[];
    activeWorkspaceId: string;
    activeBoardId: string;
}

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

export const loadWhiteBoardState = async () => {
    const database = await openDatabase();

    return new Promise<DurableWhiteBoardState | null>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(DURABLE_STATE_KEY);

        request.onsuccess = () => {
            resolve((request.result as DurableWhiteBoardState | undefined) ?? null);
        };
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => database.close();
    });
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
