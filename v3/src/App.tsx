import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./App.css";
import BoardSwitcher from "./Components/BoardSwitcher";
import ChatPanel from "./Components/ChatPanel";
import Editor from "./Components/Editor";
import SideBar from "./Components/SideBar";
import TopBar from "./Components/TopBar";
import WhiteBoard from "./Components/WhiteBoard";
import { RootState } from "./rootReducer";
import {
    hydrateWhiteBoardState,
    initializeDocument,
} from "./Store/WhiteBoardStore";
import {
    createDefaultDocument,
    loadWhiteBoardState,
    saveWhiteBoardState,
} from "./Utils/WhiteBoardPersistence";

const BOARD_WIDTH = 2400;
const BOARD_HEIGHT = 4800;

function App() {
    const dispatch = useDispatch();
    const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);
    const hasHydratedFromStorage = useRef(false);
    const whiteBoardState = useSelector((state: RootState) => state.WhiteBoardStore);
    const durableState = useMemo(
        () => ({
            boards: whiteBoardState.boards,
            activeBoardId: whiteBoardState.activeBoardId,
            version: whiteBoardState.version,
        }),
        [whiteBoardState.activeBoardId, whiteBoardState.boards, whiteBoardState.version]
    );

    useEffect(() => {
        let isActive = true;

        loadWhiteBoardState()
            .then((savedState) => {
                if (!isActive) {
                    return;
                }

                if (savedState?.boards.length) {
                    dispatch(hydrateWhiteBoardState(savedState));
                } else {
                    dispatch(initializeDocument(createDefaultDocument()));
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
        if (!hasLoadedPersistedState || !hasHydratedFromStorage.current || !whiteBoardState.boards.length) {
            return;
        }

        const saveTimer = window.setTimeout(() => {
            saveWhiteBoardState(durableState).catch(() => {
                // Persistence is best-effort.
            });
        }, 250);

        const flushSave = () => {
            saveWhiteBoardState(durableState).catch(() => {
                // Persistence is best-effort.
            });
        };

        window.addEventListener("pagehide", flushSave);

        return () => {
            window.clearTimeout(saveTimer);
            window.removeEventListener("pagehide", flushSave);
        };
    }, [durableState, hasLoadedPersistedState, whiteBoardState.boards.length]);

    if (!hasLoadedPersistedState || !whiteBoardState.boards.length) {
        return <main className="app-shell" data-testid="app-loading" />;
    }

    return (
        <main className="app-shell">
            <section className="workspace" data-testid="app-shell">
                <TopBar />
                <div className="workspace-chrome">
                    <BoardSwitcher />
                </div>
                <div className="workspace-body">
                    <SideBar />
                    <div className="canvas-viewport">
                        <WhiteBoard
                            width={BOARD_WIDTH}
                            height={BOARD_HEIGHT}
                            className="white-board"
                        />
                    </div>
                </div>
                <Editor />
                <ChatPanel />
            </section>
        </main>
    );
}

export default App;
