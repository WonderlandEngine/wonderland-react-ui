import {describe, it, expect} from 'vitest';
import {
    computeTextScaleAndWrap,
    computeDimensionsFromBoundingBox,
} from '../../js/helpers/text-helpers';
import {DEFAULT_FONT_SIZE, TEXT_BASE_SIZE} from '../../js/constants';

describe('text helpers', () => {
    it('computes scale and wrap width for normal values', () => {
        const compScaling: [number, number] = [1, 1];
        const {scale, wrapWidth} = computeTextScaleAndWrap(200, 50, compScaling);
        expect(scale).toBeCloseTo(TEXT_BASE_SIZE * 50 * 1);
        expect(wrapWidth).toBeCloseTo((200 * 1) / scale);
    });

    it('handles NaN width by producing NaN wrapWidth', () => {
        const compScaling: [number, number] = [1, 1];
        const {scale, wrapWidth} = computeTextScaleAndWrap(NaN, undefined, compScaling);
        expect(scale).toBeCloseTo(TEXT_BASE_SIZE * DEFAULT_FONT_SIZE * 1);
        expect(Number.isNaN(wrapWidth)).toBe(true);
    });

    it('computes dimensions from bounding box', () => {
        const bb = new Float32Array([0, 0, 100, 20]);
        const {width, height} = computeDimensionsFromBoundingBox(bb, 2, [1, 1]);
        expect(width).toBeCloseTo((2 * (100 - 0)) / 1);
        expect(height).toBeCloseTo((2 * (20 - 0)) / 1);
    });
});
