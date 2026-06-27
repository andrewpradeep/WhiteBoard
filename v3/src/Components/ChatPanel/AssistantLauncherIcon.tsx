interface AssistantLauncherIconProps {
    className?: string;
}

const AssistantLauncherIcon = ({ className }: AssistantLauncherIconProps) => (
    <svg
        aria-hidden="true"
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="12" cy="12" r="5.75" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="12" cy="12" r="1.75" fill="currentColor" />
    </svg>
);

export default AssistantLauncherIcon;
