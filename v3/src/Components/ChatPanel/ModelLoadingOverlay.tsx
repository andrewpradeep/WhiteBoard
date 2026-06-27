interface ModelLoadingOverlayProps {
    progressLabel: string;
    phase: "loading" | "inferencing";
}

const ModelLoadingOverlay = ({ progressLabel, phase }: ModelLoadingOverlayProps) => {
    const statusLine =
        phase === "inferencing" ? "Generating shapes…" : progressLabel || "Fetching model weights…";

    return (
        <div
            aria-live="polite"
            className="chat-model-overlay"
            data-testid="model-loading-overlay"
            role="status"
        >
            <div className="chat-model-overlay-card">
                <div aria-hidden="true" className="chat-model-animation">
                    <div className="chat-model-server">
                        <span />
                        <span />
                        <span />
                    </div>
                    <div className="chat-model-stream">
                        <span className="chat-model-packet chat-model-packet-1" />
                        <span className="chat-model-packet chat-model-packet-2" />
                        <span className="chat-model-packet chat-model-packet-3" />
                    </div>
                    <div className="chat-model-bot">
                        <span className="chat-model-bot-face">◎</span>
                    </div>
                </div>
                <p className="chat-model-status">{statusLine}</p>
                {phase === "loading" && progressLabel && (
                    <p className="chat-model-progress">{progressLabel}</p>
                )}
            </div>
        </div>
    );
};

export default ModelLoadingOverlay;
