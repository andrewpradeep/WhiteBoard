import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { RootState } from "../../rootReducer";
import {
    createBoardAction,
    renameBoardAction,
    switchBoardAction,
} from "../../Store/WhiteBoardStore";
import "./index.css";

const BoardSwitcher = () => {
    const dispatch = useDispatch();
    const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState("");
    const { boards, activeBoardId } = useSelector((state: RootState) => ({
        boards: state.WhiteBoardStore.boards,
        activeBoardId: state.WhiteBoardStore.activeBoardId,
    }));

    const handleRenameSubmit = (boardId: string) => {
        const name = renameDraft.trim();
        if (name) {
            dispatch(renameBoardAction({ id: boardId, name }));
        }
        setRenamingBoardId(null);
        setRenameDraft("");
    };

    return (
        <div className="board-switcher">
            <div className="board-tabs" role="tablist" aria-label="Boards">
                {boards.map((board) => {
                    const isActive = board.id === activeBoardId;
                    const isRenaming = renamingBoardId === board.id;

                    return (
                        <div className={`board-tab ${isActive ? "active" : ""}`} key={board.id}>
                            {isRenaming ? (
                                <input
                                    autoFocus
                                    className="board-rename-input"
                                    data-testid={`board-rename-${board.id}`}
                                    onBlur={() => handleRenameSubmit(board.id)}
                                    onChange={(event) => setRenameDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            handleRenameSubmit(board.id);
                                        }
                                        if (event.key === "Escape") {
                                            setRenamingBoardId(null);
                                        }
                                    }}
                                    value={renameDraft}
                                />
                            ) : (
                                <button
                                    aria-selected={isActive}
                                    className="board-tab-button"
                                    data-testid={isActive ? "board-tab-active" : `board-tab-${board.id}`}
                                    onClick={() => dispatch(switchBoardAction(board.id))}
                                    onDoubleClick={() => {
                                        setRenamingBoardId(board.id);
                                        setRenameDraft(board.name);
                                    }}
                                    role="tab"
                                    type="button"
                                >
                                    {board.name}
                                </button>
                            )}
                        </div>
                    );
                })}
                <button
                    aria-label="Create board"
                    className="board-tab-add"
                    data-testid="board-tab-add"
                    data-tooltip="Create board"
                    onClick={() => dispatch(createBoardAction())}
                    type="button"
                >
                    +
                </button>
            </div>
        </div>
    );
};

export default BoardSwitcher;
