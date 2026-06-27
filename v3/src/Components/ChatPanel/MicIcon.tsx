interface MicIconProps {
    className?: string;
}

const MicIcon = ({ className }: MicIconProps) => (
    <svg
        aria-hidden="true"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
        viewBox="0 0 24 24"
    >
        <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
        <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
        <path d="M12 18v3" />
    </svg>
);

export default MicIcon;
