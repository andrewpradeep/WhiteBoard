import { IBoardObject } from "../../Contracts/WhiteBoard";

export interface IDocumentOperation {
    id: string;
    boardId: string;
    type: "add" | "update" | "delete" | "batch";
    payload: unknown;
    timestamp: number;
    clientId: string;
}

export interface ISyncProvider {
    connect(): void;
    disconnect(): void;
    push(op: IDocumentOperation): void;
    onRemoteOp(callback: (op: IDocumentOperation) => void): void;
}

const CLIENT_ID =
    globalThis.crypto?.randomUUID?.() ?? `client-${Date.now().toString(36)}`;

class LocalSyncProvider implements ISyncProvider {
    connect() {}

    disconnect() {}

    push() {}

    onRemoteOp() {}
}

const operationLog: IDocumentOperation[] = [];
const MAX_OPS = 500;

export const documentStore = {
    clientId: CLIENT_ID,
    syncProvider: new LocalSyncProvider() as ISyncProvider,
    recordOperation(
        boardId: string,
        type: IDocumentOperation["type"],
        payload: unknown
    ) {
        operationLog.push({
            id: createId("op"),
            boardId,
            type,
            payload,
            timestamp: Date.now(),
            clientId: CLIENT_ID,
        });

        if (operationLog.length > MAX_OPS) {
            operationLog.splice(0, operationLog.length - MAX_OPS);
        }
    },
    getRecentOperations(boardId?: string) {
        return boardId
            ? operationLog.filter((operation) => operation.boardId === boardId)
            : [...operationLog];
    },
};

const createId = (prefix: string) =>
    `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;

export const recordShapeBatch = (boardId: string, shapes: IBoardObject[]) => {
    documentStore.recordOperation(boardId, "batch", shapes);
};
