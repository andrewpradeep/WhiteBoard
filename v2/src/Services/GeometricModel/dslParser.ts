export type ModelDslKind = "sq" | "cr" | "rect" | "tri" | "line";

export interface ModelDslToken {
    kind: ModelDslKind;
    x: number;
    y: number;
    size: number;
}

const TOKEN_PATTERN = /\b(sq|cr|rect|tri|line)\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,-?\d+(?:\.\d+)?)*\)/g;

const toModelNumber = (value: string) => Math.round(Number(value));

export const parseModelDsl = (dslOutput: string): ModelDslToken[] => {
    const tokens: ModelDslToken[] = [];
    let match: RegExpExecArray | null;

    while ((match = TOKEN_PATTERN.exec(dslOutput)) !== null) {
        const [, kind, x, y, size] = match;
        const token: ModelDslToken = {
            kind: kind as ModelDslKind,
            x: toModelNumber(x),
            y: toModelNumber(y),
            size: Math.max(1, toModelNumber(size)),
        };

        if (Number.isFinite(token.x) && Number.isFinite(token.y) && Number.isFinite(token.size)) {
            tokens.push(token);
        }
    }

    return tokens;
};
