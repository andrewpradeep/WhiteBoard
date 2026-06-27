import { expect, test } from "@playwright/test";
import { IBoardShapes } from "../v3/src/Contracts/WhiteBoard";
import { avoidExistingShapes } from "../v3/src/Services/GeometricModel/placementAvoidance";

const boundsOverlap = (
    first: { left: number; right: number; top: number; bottom: number },
    second: { left: number; right: number; top: number; bottom: number },
    gap: number
) =>
    !(
        first.right + gap <= second.left ||
        first.left >= second.right + gap ||
        first.bottom + gap <= second.top ||
        first.top >= second.bottom + gap
    );

test.describe("placement avoidance", () => {
    test("leaves non-overlapping shapes unchanged", () => {
        const existing = [
            {
                id: "existing",
                type: IBoardShapes.RECT,
                x: 40,
                y: 40,
                width: 80,
                height: 80,
            },
        ];
        const generated = [
            {
                id: "generated",
                type: IBoardShapes.CIRCLE,
                x: 400,
                y: 400,
                radius: 30,
            },
        ];

        const placed = avoidExistingShapes(generated, existing);
        expect(placed[0].x).toBe(400);
        expect(placed[0].y).toBe(400);
    });

    test("shifts overlapping generated shapes away from existing ones", () => {
        const existing = [
            {
                id: "existing",
                type: IBoardShapes.RECT,
                x: 240,
                y: 240,
                width: 120,
                height: 90,
            },
        ];
        const generated = [
            {
                id: "generated",
                type: IBoardShapes.CIRCLE,
                x: 280,
                y: 280,
                radius: 40,
            },
        ];

        const placed = avoidExistingShapes(generated, existing);
        const placedCircle = placed[0];
        const overlap = boundsOverlap(
            {
                left: placedCircle.x - 40,
                right: placedCircle.x + 40,
                top: placedCircle.y - 40,
                bottom: placedCircle.y + 40,
            },
            {
                left: 240,
                right: 360,
                top: 240,
                bottom: 330,
            },
            24
        );

        expect(overlap).toBe(false);
        expect(placedCircle.x !== 280 || placedCircle.y !== 280).toBe(true);
    });

    test("preserves spacing inside generated groups", () => {
        const existing = [
            {
                id: "existing",
                type: IBoardShapes.RECT,
                x: 240,
                y: 240,
                width: 120,
                height: 90,
            },
        ];
        const generated = [
            {
                id: "base",
                type: IBoardShapes.RECT,
                x: 250,
                y: 320,
                width: 120,
                height: 90,
            },
            {
                id: "roof",
                type: IBoardShapes.TRIANGLE,
                x: 250,
                y: 240,
                width: 120,
                height: 80,
            },
        ];

        const placed = avoidExistingShapes(generated, existing);
        const verticalGap = placed[0].y - (placed[1].y + 80);
        expect(verticalGap).toBe(0);
    });
});
