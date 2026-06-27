import { findFuzzyMatch } from "../../Utils/fuzzyMatch";
import { ModelDslKind } from "./dslParser";

export const shapeAliasKinds: Record<string, ModelDslKind> = {
    circle: "cr",
    cr: "cr",
    rectangle: "rect",
    rect: "rect",
    square: "sq",
    sq: "sq",
    triangle: "tri",
    tri: "tri",
    line: "line",
};

const fuzzyShapeWords = ["circle", "rectangle", "rect", "square", "triangle", "line"] as const;

export const resolveShapeAlias = (word: string): ModelDslKind | null => {
    const normalized = word.toLowerCase();
    const exactMatch = shapeAliasKinds[normalized];
    if (exactMatch) {
        return exactMatch;
    }

    if (normalized.length < 4) {
        return null;
    }

    const fuzzyMatch = findFuzzyMatch(normalized, fuzzyShapeWords);
    return fuzzyMatch ? shapeAliasKinds[fuzzyMatch] : null;
};
