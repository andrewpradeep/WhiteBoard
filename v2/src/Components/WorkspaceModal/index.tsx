import { FormEvent, useEffect, useState } from "react";
import "./index.css";

export interface WorkspaceModalProps {
    isOpen: boolean;
    mode?: "create" | "edit";
    initialValues?: { name: string; description: string };
    onClose: () => void;
    onCreate: (data: { name: string; description: string }) => void;
}

const WorkspaceModal = ({
    isOpen,
    mode = "create",
    initialValues,
    onClose,
    onCreate,
}: WorkspaceModalProps) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (isOpen) {
            setName(initialValues?.name ?? "");
            setDescription(initialValues?.description ?? "");
        }
    }, [initialValues, isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!name.trim()) {
            return;
        }

        onCreate({
            name,
            description,
        });
    };

    return (
        <div className="workspace-modal-backdrop" role="presentation">
            <div aria-modal="true" className="workspace-modal" role="dialog">
                <div className="workspace-modal-header">
                    <div>
                        <p>{mode === "edit" ? "Edit workspace" : "New workspace"}</p>
                        <h2>{mode === "edit" ? "Update workspace" : "Create a workspace"}</h2>
                    </div>
                    <button aria-label="Close modal" onClick={onClose} type="button">
                        ×
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <label>
                        Workspace name
                        <input
                            autoFocus
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Product strategy"
                            type="text"
                            value={name}
                        />
                    </label>
                    <label>
                        Description
                        <textarea
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder="What will this workspace be used for?"
                            rows={4}
                            value={description}
                        />
                    </label>
                    <div className="workspace-modal-actions">
                        <button onClick={onClose} type="button">
                            Cancel
                        </button>
                        <button disabled={!name.trim()} type="submit">
                            {mode === "edit" ? "Save changes" : "Create workspace"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WorkspaceModal;
