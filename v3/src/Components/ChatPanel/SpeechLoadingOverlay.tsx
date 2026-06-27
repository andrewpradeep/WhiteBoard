import MicIcon from "./MicIcon";

interface SpeechLoadingOverlayProps {
    progressLabel: string;
}

const SpeechLoadingOverlay = ({ progressLabel }: SpeechLoadingOverlayProps) => (
    <div
        aria-live="polite"
        className="speech-loading-overlay"
        data-testid="speech-loading-overlay"
        role="status"
    >
        <div className="speech-loading-overlay-card">
            <div aria-hidden="true" className="speech-loading-mic">
                <MicIcon className="speech-loading-mic-icon" />
                <span className="speech-loading-mic-ring" />
            </div>
            <p className="speech-loading-status">Loading offline speech model…</p>
            {progressLabel && <p className="speech-loading-progress">{progressLabel}</p>}
        </div>
    </div>
);

export default SpeechLoadingOverlay;
