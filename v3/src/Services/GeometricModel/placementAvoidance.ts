import { IBoardObject } from "../../Contracts/WhiteBoard";
import { getShapeBounds } from "../../Utils/anchorGeometry";

const DEFAULT_GAP = 24;

interface AxisBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

const getAxisBounds = (boardObject: IBoardObject): AxisBounds => {
    const bounds = getShapeBounds(boardObject);
    return {
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        bottom: bounds.bottom,
    };
};

const getGroupBounds = (objects: IBoardObject[]): AxisBounds => {
    const bounds = objects.map(getAxisBounds);
    return {
        left: Math.min(...bounds.map((entry) => entry.left)),
        right: Math.max(...bounds.map((entry) => entry.right)),
        top: Math.min(...bounds.map((entry) => entry.top)),
        bottom: Math.max(...bounds.map((entry) => entry.bottom)),
    };
};

const boundsOverlap = (first: AxisBounds, second: AxisBounds, gap: number) =>
    !(
        first.right + gap <= second.left ||
        first.left >= second.right + gap ||
        first.bottom + gap <= second.top ||
        first.top >= second.bottom + gap
    );

const overlapsExisting = (
    generated: IBoardObject[],
    existing: IBoardObject[],
    gap: number
) =>
    generated.some((generatedObject) =>
        existing.some((existingObject) =>
            boundsOverlap(getAxisBounds(generatedObject), getAxisBounds(existingObject), gap)
        )
    );

const translateObject = (boardObject: IBoardObject, dx: number, dy: number): IBoardObject => ({
    ...boardObject,
    x: boardObject.x + dx,
    y: boardObject.y + dy,
});

const translateGroup = (objects: IBoardObject[], dx: number, dy: number) =>
    objects.map((object) => translateObject(object, dx, dy));

const buildPlacementCandidates = (
    generatedBounds: AxisBounds,
    existingBounds: AxisBounds,
    gap: number
) => {
    const candidates = [{ dx: 0, dy: 0 }];

    const snapRight = existingBounds.right + gap - generatedBounds.left;
    const snapBelow = existingBounds.bottom + gap - generatedBounds.top;
    const snapLeft = existingBounds.left - gap - generatedBounds.right;
    const snapAbove = existingBounds.top - gap - generatedBounds.bottom;

    candidates.push(
        { dx: snapRight, dy: 0 },
        { dx: 0, dy: snapBelow },
        { dx: snapRight, dy: snapBelow },
        { dx: snapLeft, dy: 0 },
        { dx: 0, dy: snapAbove },
        { dx: snapLeft, dy: snapAbove },
        { dx: snapRight, dy: snapBelow / 2 },
        { dx: snapRight / 2, dy: snapBelow }
    );

    const step = 56;
    for (let row = -10; row <= 10; row += 1) {
        for (let column = -10; column <= 10; column += 1) {
            if (row === 0 && column === 0) {
                continue;
            }
            candidates.push({ dx: column * step, dy: row * step });
        }
    }

    return candidates.sort(
        (first, second) => Math.hypot(first.dx, first.dy) - Math.hypot(second.dx, second.dy)
    );
};

export const avoidExistingShapes = (
    generated: IBoardObject[],
    existing: IBoardObject[],
    gap = DEFAULT_GAP
): IBoardObject[] => {
    if (!generated.length || !existing.length) {
        return generated;
    }

    if (!overlapsExisting(generated, existing, gap)) {
        return generated;
    }

    const generatedBounds = getGroupBounds(generated);
    const existingBounds = getGroupBounds(existing);
    const candidates = buildPlacementCandidates(generatedBounds, existingBounds, gap);

    for (const candidate of candidates) {
        const moved = translateGroup(generated, candidate.dx, candidate.dy);
        if (!overlapsExisting(moved, existing, gap)) {
            return moved;
        }
    }

    return translateGroup(generated, existingBounds.right + gap * 2 - generatedBounds.left, 0);
};
