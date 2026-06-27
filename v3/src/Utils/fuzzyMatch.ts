export const levenshteinDistance = (left: string, right: string) => {
    if (left === right) {
        return 0;
    }

    if (!left.length) {
        return right.length;
    }

    if (!right.length) {
        return left.length;
    }

    const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);
    const currentRow = new Array<number>(right.length + 1);

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        currentRow[0] = leftIndex;

        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
            currentRow[rightIndex] = Math.min(
                currentRow[rightIndex - 1] + 1,
                previousRow[rightIndex] + 1,
                previousRow[rightIndex - 1] + substitutionCost
            );
        }

        for (let index = 0; index <= right.length; index += 1) {
            previousRow[index] = currentRow[index];
        }
    }

    return previousRow[right.length];
};

export const getMaxEditDistance = (word: string) => {
    if (word.length <= 4) {
        return 1;
    }

    if (word.length <= 7) {
        return 2;
    }

    return Math.max(2, Math.floor(word.length / 4));
};

export const findFuzzyMatch = <T extends string>(
    word: string,
    candidates: readonly T[],
    maxDistance = getMaxEditDistance(word)
): T | null => {
    let bestMatch: T | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
        const distance = levenshteinDistance(word, candidate);
        if (distance > maxDistance) {
            continue;
        }

        if (
            distance < bestDistance ||
            (distance === bestDistance && candidate.length > (bestMatch?.length ?? 0))
        ) {
            bestMatch = candidate;
            bestDistance = distance;
        }
    }

    return bestMatch;
};
