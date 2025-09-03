import {describe, it, expect} from 'vitest';
import {computeMeshChildTransforms} from '../../js/renderer/mesh-transform-helpers';

describe('mesh transform helpers', () => {
    it('returns center position and resetScaling for roundedRectangle', () => {
        const t = computeMeshChildTransforms(100, 50, undefined, 'roundedRectangle');
        expect(t.position).toEqual([50, -25, 0.001]);
        expect(t.resetScaling).toBe(true);
        expect(t.scaling).toBeUndefined();
    });

    it('returns center position and scaling for plane without z', () => {
        const t = computeMeshChildTransforms(200, 80, undefined, 'mesh');
        expect(t.position).toEqual([100, -40, 0.001]);
        expect(t.scaling).toEqual([100, 40, 100]);
    });

    it('returns scaling z=1 when z is provided', () => {
        const t = computeMeshChildTransforms(200, 80, 2, 'mesh');
        expect(t.position).toEqual([100, -40, 0.001 + 2]);
        expect(t.scaling).toEqual([100, 40, 1]);
    });
});
