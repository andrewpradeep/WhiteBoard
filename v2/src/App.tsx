import { useEffect, useMemo, useRef, useState } from "react";
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

function App() {
    const dispatch = useDispatch();
    const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
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

                if (savedState) {
                    dispatch(hydrateWhiteBoardState(savedState));
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
                <div className="canvas-frame">
                    <WhiteBoard width={2000} height={2000} className="white-board" />
                </div>
                <Editor />
            </section>
        </main>
    );
}

export default App;
