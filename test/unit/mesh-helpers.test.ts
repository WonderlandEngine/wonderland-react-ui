import {describe, it, expect} from 'vitest';
import {
    buildRoundedRectangleMeshProps,
    buildNineSliceProps,
} from '../../js/renderer/mesh-helpers';

describe('mesh helpers', () => {
    it('buildRoundedRectangleMeshProps applies defaults and scaling', () => {
        const props = {rounding: 10, resolution: 3, roundTopLeft: false};
        const p = buildRoundedRectangleMeshProps(props, 100, 50, [2, 1]);
        expect(p.sw).toBe(100);
        expect(p.sh).toBe(50);
        expect(p.rounding).toBe(20); // 10 * compScaling[0]
        expect(p.resolution).toBe(3);
        expect(p.tl).toBe(false);
        expect(p.tr).toBe(true);
    });

    it('buildNineSliceProps applies defaults and scaling', () => {
        const props = {borderTextureSize: 8, borderSize: 2};
        const p = buildNineSliceProps(props, 200, 100, [1.5, 1]);
        expect(p.sw).toBe(200);
        expect(p.sh).toBe(100);
        expect(p.borderTextureSize).toBe(8);
        expect(p.borderSize).toBeCloseTo(3); // 2 * 1.5
    });
});
