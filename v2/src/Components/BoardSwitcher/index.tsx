import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../rootReducer";
import {
    createBoardAction,
    getActiveWorkspace,
    getTotalBoardCount,
    MAX_ELEMENTS_PER_BOARD,
    MAX_TOTAL_BOARDS,
    renameBoardAction,
    switchBoardAction,
} from "../../Store/WhiteBoardStore";
import "./index.css";
import { useState } from "react";

export interface BoardSwitcherProps {
    onBackToWorkspaces: () => void;
}

const BoardSwitcher = ({ onBackToWorkspaces }: BoardSwitcherProps) => {
    const dispatch = useDispatch();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isWorkspacePanelOpen, setIsWorkspacePanelOpen] = useState(false);
    const {
        activeWorkspace,
        boards,
        activeBoardId,
        activeBoardObjectCount,
        totalBoardCount,
    } = useSelector((state: RootState) => {
        const activeWorkspace = getActiveWorkspace(state.WhiteBoardStore);
        const activeBoard = activeWorkspace?.boards.find(
            (board) => board.id === state.WhiteBoardStore.activeBoardId
        );
        return {
            activeWorkspace,
            boards: activeWorkspace?.boards ?? [],
            activeBoardId: state.WhiteBoardStore.activeBoardId,
            activeBoardObjectCount: activeBoard?.ObjectList.length ?? 0,
            totalBoardCount: getTotalBoardCount(state.WhiteBoardStore),
        };
    });
    const isBoardLimitReached = totalBoardCount >= MAX_TOTAL_BOARDS;
    const isElementLimitReached = activeBoardObjectCount >= MAX_ELEMENTS_PER_BOARD;
    const activeBoard = boards.find((board) => board.id === activeBoardId);

    const renderBoardControls = (className = "") => (
        <div className={`board-controls ${className}`}>
            <div className="board-select">
                <span>Board</span>
                <div className="board-select-control">
                    <select
                        aria-label="Select board"
                        onChange={(event) => {
                            dispatch(switchBoardAction(event.target.value));
                            setIsWorkspacePanelOpen(false);
                        }}
                        value={activeBoardId}
                    >
                        {boards.map((board) => (
                            <option key={board.id} value={board.id}>
                                {board.name}
                            </option>
                        ))}
                    </select>
                    <span aria-hidden="true" className="board-select-arrow">
                        ▾
                    </span>
                </div>
            </div>
            <div className="board-menu">
                <button
                    className="board-menu-trigger"
                    onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
                    title="Board options"
                    type="button"
                >
                    ⋮
                </button>
                {isMenuOpen && (
                    <div className="board-menu-content">
                        <div className="board-menu-title">{activeBoard?.name}</div>
                        <button
                            disabled={isBoardLimitReached}
                            onClick={() => {
                                if (isBoardLimitReached) {
                                    return;
                                }

                                dispatch(createBoardAction());
                                setIsMenuOpen(false);
                                setIsWorkspacePanelOpen(false);
                            }}
                            type="button"
                        >
                            {isBoardLimitReached ? "Board limit reached" : "Create board"}
                        </button>
                        <button onClick={handleRename} type="button">
                            Rename active board
                        </button>
                        {isElementLimitReached && (
                            <div className="board-menu-note">
                                Active board has reached {MAX_ELEMENTS_PER_BOARD} elements.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const handleRename = () => {
        const activeBoard = boards.find((board) => board.id === activeBoardId);
        if (!activeBoard) {
            return;
        }

        const name = window.prompt("Rename board", activeBoard.name);
        if (name) {
            dispatch(renameBoardAction({ id: activeBoard.id, name }));
            setIsMenuOpen(false);
        }
    };

    return (
        <div className="board-switcher">
            <div className={`board-switcher-summary ${isWorkspacePanelOpen ? "open" : ""}`}>
                <button
                    className="workspace-back-button"
                    onClick={onBackToWorkspaces}
                    type="button"
                >
                    ← Workspaces
                </button>
                <button
                    className="workspace-accordion-trigger"
                    onClick={() => setIsWorkspacePanelOpen((currentValue) => !currentValue)}
                    type="button"
                >
                    <span className="workspace-accordion-title">
                        <strong>{activeWorkspace?.name}</strong>
                        <span>{activeBoard?.name}</span>
                    </span>
                    <span>{isWorkspacePanelOpen ? "⌃" : "⌄"}</span>
                </button>
                <div className="workspace-accordion-panel">
                    <div className="workspace-accordion-meta">
                        <strong>{activeWorkspace?.name}</strong>
                        <span>
                            {totalBoardCount}/{MAX_TOTAL_BOARDS} boards · {activeBoardObjectCount}/
                            {MAX_ELEMENTS_PER_BOARD} objects
                        </span>
                    </div>
                    {renderBoardControls("mobile-board-controls")}
                </div>
            </div>
            {renderBoardControls("desktop-board-controls")}
        </div>
    );
};

export default BoardSwitcher;
