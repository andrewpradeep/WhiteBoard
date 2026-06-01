import { useMemo, useState } from "react";
import { IWorkspace } from "../../Contracts/WhiteBoard";
import {
    MAX_TOTAL_BOARDS,
    getTotalBoardCount,
    WhiteBoardState,
} from "../../Store/WhiteBoardStore";
import WorkspaceModal from "../WorkspaceModal";
import "./index.css";

const WORKSPACES_PER_PAGE = 10;
const DESCRIPTION_LIMIT = 500;

export interface WorkspaceListProps {
    whiteBoardState: WhiteBoardState;
    onCreateWorkspace: (data: { name: string; description: string }) => void;
    onDeleteWorkspace: (data: { id: string; moveBoardsToWorkspaceId?: string }) => void;
    onUpdateWorkspace: (data: { id: string; name: string; description: string }) => void;
    onOpenWorkspace: (workspaceId: string) => void;
}

const getWorkspaceObjectCount = (workspace: IWorkspace) => {
    return workspace.boards.reduce((count, board) => count + board.ObjectList.length, 0);
};

const getTruncatedDescription = (description: string) => {
    if (!description) {
        return "No description";
    }

    return description.length > DESCRIPTION_LIMIT
        ? `${description.slice(0, DESCRIPTION_LIMIT)}...`
        : description;
};

const WorkspaceList = ({
    whiteBoardState,
    onCreateWorkspace,
    onDeleteWorkspace,
    onUpdateWorkspace,
    onOpenWorkspace,
}: WorkspaceListProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<IWorkspace | null>(null);
    const [deletingWorkspace, setDeletingWorkspace] = useState<IWorkspace | null>(null);
    const [targetWorkspaceId, setTargetWorkspaceId] = useState("");
    const { workspaces } = whiteBoardState;
    const totalBoardCount = getTotalBoardCount(whiteBoardState);
    const canCreateWorkspace = totalBoardCount < MAX_TOTAL_BOARDS;
    const totalPages = Math.max(1, Math.ceil(workspaces.length / WORKSPACES_PER_PAGE));
    const visibleWorkspaces = useMemo(() => {
        const startIndex = (currentPage - 1) * WORKSPACES_PER_PAGE;
        return workspaces.slice(startIndex, startIndex + WORKSPACES_PER_PAGE);
    }, [currentPage, workspaces]);

    const handleCreateWorkspace = (data: { name: string; description: string }) => {
        onCreateWorkspace(data);
        setIsModalOpen(false);
        setCurrentPage(1);
    };

    const handleEditWorkspace = (data: { name: string; description: string }) => {
        if (!editingWorkspace) {
            return;
        }

        onUpdateWorkspace({
            id: editingWorkspace.id,
            ...data,
        });
        setEditingWorkspace(null);
        setIsModalOpen(false);
    };

    const handleCloseModal = () => {
        setEditingWorkspace(null);
        setIsModalOpen(false);
    };

    const handleDeleteClick = (workspace: IWorkspace) => {
        const fallbackTarget = workspaces.find((item) => item.id !== workspace.id);
        setDeletingWorkspace(workspace);
        setTargetWorkspaceId(fallbackTarget?.id ?? "");
    };

    const handleConfirmDelete = () => {
        if (!deletingWorkspace) {
            return;
        }

        onDeleteWorkspace({
            id: deletingWorkspace.id,
            moveBoardsToWorkspaceId: targetWorkspaceId || undefined,
        });
        setDeletingWorkspace(null);
        setTargetWorkspaceId("");
    };

    if (!workspaces.length) {
        return (
            <section className="workspace-list-page empty">
                <div className="empty-workspace-card">
                    <span className="empty-workspace-icon">+</span>
                    <p>Start with a workspace</p>
                    <h1>Create your first CreamBoard workspace</h1>
                    <span>
                        Organize boards by team, project, or initiative. Each workspace starts
                        with one board.
                    </span>
                    <button onClick={() => setIsModalOpen(true)} type="button">
                        Create workspace
                    </button>
                </div>
                <WorkspaceModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onCreate={handleCreateWorkspace}
                />
            </section>
        );
    }

    return (
        <section className="workspace-list-page">
            <div className="workspace-list-shell">
                <header className="workspace-list-header">
                    <div>
                        <p>Workspaces</p>
                        <h1>Your workspaces</h1>
                        <span>
                            {workspaces.length} workspaces · {totalBoardCount}/{MAX_TOTAL_BOARDS} boards
                        </span>
                    </div>
                    <button
                        disabled={!canCreateWorkspace}
                        onClick={() => setIsModalOpen(true)}
                        type="button"
                    >
                        Create workspace
                    </button>
                </header>
                <div className="workspace-table-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Boards</th>
                                <th>Objects</th>
                                <th aria-label="Workspace actions"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleWorkspaces.map((workspace) => (
                                <tr key={workspace.id}>
                                    <td>
                                        <button
                                            className="workspace-name-button"
                                            onClick={() => onOpenWorkspace(workspace.id)}
                                            type="button"
                                        >
                                            {workspace.name}
                                        </button>
                                    </td>
                                    <td>{getTruncatedDescription(workspace.description)}</td>
                                    <td>{workspace.boards.length}</td>
                                    <td>{getWorkspaceObjectCount(workspace)}</td>
                                    <td>
                                        <div className="workspace-action-cell">
                                            <button
                                                aria-label={`Edit ${workspace.name}`}
                                                className="workspace-edit-button"
                                                onClick={() => {
                                                    setEditingWorkspace(workspace);
                                                    setIsModalOpen(true);
                                                }}
                                                type="button"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                aria-label={`Delete ${workspace.name}`}
                                                className="workspace-delete-button"
                                                onClick={() => handleDeleteClick(workspace)}
                                                type="button"
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="workspace-pagination">
                        <span>
                            Page {currentPage} of {totalPages}
                        </span>
                        <div>
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                type="button"
                            >
                                Previous
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() =>
                                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                                }
                                type="button"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <WorkspaceModal
                initialValues={editingWorkspace ?? undefined}
                isOpen={isModalOpen}
                mode={editingWorkspace ? "edit" : "create"}
                onClose={handleCloseModal}
                onCreate={editingWorkspace ? handleEditWorkspace : handleCreateWorkspace}
            />
            {deletingWorkspace && (
                <div className="workspace-delete-modal-backdrop" role="presentation">
                    <div aria-modal="true" className="workspace-delete-modal" role="dialog">
                        <div>
                            <p>Delete workspace</p>
                            <h2>Delete {deletingWorkspace.name}?</h2>
                            <span>
                                This workspace has {deletingWorkspace.boards.length} boards. Move
                                them to another workspace before deleting, or delete them with the
                                workspace if no target is available.
                            </span>
                        </div>
                        {workspaces.some((workspace) => workspace.id !== deletingWorkspace.id) ? (
                            <label>
                                Move boards to
                                <select
                                    onChange={(event) => setTargetWorkspaceId(event.target.value)}
                                    value={targetWorkspaceId}
                                >
                                    {workspaces
                                        .filter((workspace) => workspace.id !== deletingWorkspace.id)
                                        .map((workspace) => (
                                            <option key={workspace.id} value={workspace.id}>
                                                {workspace.name}
                                            </option>
                                        ))}
                                </select>
                            </label>
                        ) : (
                            <div className="workspace-delete-warning">
                                No other workspace exists. Deleting this workspace will also delete
                                its boards.
                            </div>
                        )}
                        <div className="workspace-delete-actions">
                            <button
                                onClick={() => {
                                    setDeletingWorkspace(null);
                                    setTargetWorkspaceId("");
                                }}
                                type="button"
                            >
                                Cancel
                            </button>
                            <button onClick={handleConfirmDelete} type="button">
                                Delete workspace
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default WorkspaceList;
