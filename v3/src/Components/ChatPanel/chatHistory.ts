export interface ChatMessageSection {
    title: string;
    examples: readonly string[];
}

export interface ChatMessageGuide {
    lead: string;
    sections: readonly ChatMessageSection[];
    footer?: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    guide?: ChatMessageGuide;
}

export const PATTERN_EXAMPLES = [
    "draw a house",
    "draw a smiley",
    "3x3 grid of circles",
    "row of 5 rectangles",
] as const;

export const PLACEMENT_EXAMPLE_GROUPS = [
    {
        title: "Named placement",
        examples: [
            "add a square 20px left of rect2",
            "add a circle right of circle1",
            "add a triangle below rect1",
        ],
    },
    {
        title: "Relative placement",
        examples: [
            "add a circle to the right of the rectangle",
            "create a square below the circle",
            "add a triangle near the circle",
        ],
    },
] as const;

const formatExampleGroup = (title: string, examples: readonly string[]) =>
    `${title}:\n${examples.map((example) => `• ${example}`).join("\n")}`;

export const formatPatternExamples = () =>
    formatExampleGroup("Patterns", PATTERN_EXAMPLES);

export const formatPlacementExamples = () =>
    PLACEMENT_EXAMPLE_GROUPS.map((group) => formatExampleGroup(group.title, group.examples)).join(
        "\n\n"
    );

export const createChatMessage = (
    role: ChatMessage["role"],
    content: string,
    guide?: ChatMessageGuide
): ChatMessage => ({
    id: `${role}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
    role,
    content,
    guide,
});

export const createIntroMessage = (): ChatMessage =>
    createChatMessage(
        "assistant",
        `I can add shapes to your board. Examples:\n\n${formatPatternExamples()}\n\nType a command or tap the mic. Labels appear on the canvas while the assistant is open.`,
        {
            lead: "I can add shapes to your board. Examples:",
            sections: [{ title: "Patterns", examples: PATTERN_EXAMPLES }],
            footer: "Type a command or tap the mic. Labels appear on the canvas while the assistant is open.",
        }
    );

export const createPlacementGuideMessage = (): ChatMessage =>
    createChatMessage(
        "assistant",
        `Once you have shapes on the board, you can place new ones relative to them:\n\n${formatPlacementExamples()}`,
        {
            lead: "Once you have shapes on the board, you can place new ones relative to them:",
            sections: PLACEMENT_EXAMPLE_GROUPS,
        }
    );
