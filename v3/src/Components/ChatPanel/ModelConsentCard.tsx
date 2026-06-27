import { MODEL_BUNDLE_SIZE_LABEL } from "./modelConsent";

interface ModelConsentCardProps {
    onConfirm: () => void;
    onCancel: () => void;
}

const ModelConsentCard = ({ onConfirm, onCancel }: ModelConsentCardProps) => (
    <div className="chat-model-consent" data-testid="model-consent-card" role="dialog">
        <div className="chat-model-consent-card">
            <p className="chat-model-consent-title">Download geometric model?</p>
            <p className="chat-model-consent-copy">
                The assistant loads a local model ({MODEL_BUNDLE_SIZE_LABEL}) on first use. This happens
                once per browser session.
            </p>
            <div className="chat-model-consent-actions">
                <button data-testid="model-consent-cancel" onClick={onCancel} type="button">
                    Cancel
                </button>
                <button data-testid="model-consent-confirm" onClick={onConfirm} type="button">
                    Download &amp; continue
                </button>
            </div>
        </div>
    </div>
);

export default ModelConsentCard;
