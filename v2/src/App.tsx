import { UIEvent, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./App.css";
import BoardSwitcher from "./Components/BoardSwitcher";
import Editor from "./Components/Editor";
import SideBar from "./Components/SideBar";
import WorkspaceList from "./Components/WorkspaceList";

import WhiteBoard from "./Components/WhiteBoard";
import { RootState } from "./rootReducer";
import {
    createWorkspaceAction,
    deleteWorkspaceAction,
    hydrateWhiteBoardState,
    switchWorkspaceAction,
    updateWorkspaceAction,
} from "./Store/WhiteBoardStore";
import {
    loadWhiteBoardState,
    saveWhiteBoardState,
} from "./Utils/WhiteBoardPersistence";

const INITIAL_BOARD_WIDTH = 2400;
const INITIAL_BOARD_HEIGHT = 4800;
const BOARD_EXPAND_THRESHOLD = 180;
const BOARD_EXPAND_STEP = 1000;
const MAX_BOARD_SIZE = 12000;

function App() {
    const dispatch = useDispatch();
    const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [boardSize, setBoardSize] = useState({
        width: INITIAL_BOARD_WIDTH,
        height: INITIAL_BOARD_HEIGHT,
    });
    const hasHydratedFromStorage = useRef(false);
    const whiteBoardState = useSelector((state: RootState) => state.WhiteBoardStore);
    const durableState = useMemo(() => {
        return {
            workspaces: whiteBoardState.workspaces,
            activeWorkspaceId: whiteBoardState.activeWorkspaceId,
            activeBoardId: whiteBoardState.activeBoardId,
        };
    }, [whiteBoardState.activeBoardId, whiteBoardState.activeWorkspaceId, whiteBoardState.workspaces]);
    const serializedDurableState = useMemo(() => {
        return JSON.stringify(durableState);
    }, [durableState]);

    useEffect(() => {
        let isActive = true;

        loadWhiteBoardState()
            .then((savedState) => {
                if (!isActive) {
                    return;
                }

                if (savedState?.workspaces.length) {
                    dispatch(hydrateWhiteBoardState(savedState));
                    setIsWorkspaceOpen(true);
                } else {
                    dispatch(
                        createWorkspaceAction({
                            name: "Default",
                            description: "Default workspace",
                        })
                    );
                    setIsWorkspaceOpen(true);
                }
            })
            .finally(() => {
                if (isActive) {
                    hasHydratedFromStorage.current = true;
                    setHasLoadedPersistedState(true);
                }
            });

        return () => {
            isActive = false;
        };
    }, [dispatch]);

    useEffect(() => {
        if (!hasLoadedPersistedState || !hasHydratedFromStorage.current) {
            return;
        }

        const saveTimer = window.setTimeout(() => {
            saveWhiteBoardState(JSON.parse(serializedDurableState)).catch(() => {
                // Persistence is best-effort; Redux remains the source of truth during the session.
            });
        }, 500);

        return () => window.clearTimeout(saveTimer);
    }, [hasLoadedPersistedState, serializedDurableState]);

    const handleCreateWorkspace = (data: { name: string; description: string }) => {
        dispatch(createWorkspaceAction(data));
    };

    const handleUpdateWorkspace = (data: { id: string; name: string; description: string }) => {
        dispatch(updateWorkspaceAction(data));
    };

    const handleDeleteWorkspace = (data: { id: string; moveBoardsToWorkspaceId?: string }) => {
        dispatch(deleteWorkspaceAction(data));
        if (data.id === whiteBoardState.activeWorkspaceId) {
            setIsWorkspaceOpen(false);
        }
    };

    const handleOpenWorkspace = (workspaceId: string) => {
        dispatch(switchWorkspaceAction(workspaceId));
        setIsWorkspaceOpen(true);
    };

    const handleCanvasFrameScroll = (event: UIEvent<HTMLDivElement>) => {
        const frame = event.currentTarget;
        const isNearRightEdge =
            frame.scrollLeft + frame.clientWidth >= frame.scrollWidth - BOARD_EXPAND_THRESHOLD;
        const isNearBottomEdge =
            frame.scrollTop + frame.clientHeight >= frame.scrollHeight - BOARD_EXPAND_THRESHOLD;

        if (!isNearRightEdge && !isNearBottomEdge) {
            return;
        }

        setBoardSize((currentSize) => {
            const nextSize = {
                width:
                    isNearRightEdge && currentSize.width < MAX_BOARD_SIZE
                        ? Math.min(currentSize.width + BOARD_EXPAND_STEP, MAX_BOARD_SIZE)
                        : currentSize.width,
                height:
                    isNearBottomEdge && currentSize.height < MAX_BOARD_SIZE
                        ? Math.min(currentSize.height + BOARD_EXPAND_STEP, MAX_BOARD_SIZE)
                        : currentSize.height,
            };

            return nextSize.width === currentSize.width && nextSize.height === currentSize.height
                ? currentSize
                : nextSize;
        });
    };

    if (!hasLoadedPersistedState) {
        return <main className="app-shell" />;
    }

    if (!isWorkspaceOpen || !whiteBoardState.workspaces.length) {
        return (
            <main className="app-shell">
                <WorkspaceList
                    onCreateWorkspace={handleCreateWorkspace}
                    onDeleteWorkspace={handleDeleteWorkspace}
                    onOpenWorkspace={handleOpenWorkspace}
                    onUpdateWorkspace={handleUpdateWorkspace}
                    whiteBoardState={whiteBoardState}
                />
            </main>
        );
    }

    return (
        <main className="app-shell">
            <section className="workspace">
                <BoardSwitcher onBackToWorkspaces={() => setIsWorkspaceOpen(false)} />
                <SideBar />
                <div className="canvas-frame" onScroll={handleCanvasFrameScroll}>
                    <WhiteBoard
                        width={boardSize.width}
                        height={boardSize.height}
                        className="white-board"
                    />
                </div>
                <Editor />
            </section>
        </main>
    );
}

export default App;
