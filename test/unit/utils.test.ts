import {describe, it, expect} from 'vitest';
import {parseColor} from '../../dist/utils.js';

describe('Utils', () => {
    it('parseColor', () => {
        /* hex string RGBA support */
        expect(parseColor('#ff00ff00')).toEqual(Float32Array.from([1, 0, 1, 0]));
        expect(parseColor('ff00ff00')).toEqual(Float32Array.from([1, 0, 1, 0]));

        /* hex string RGB support */
        expect(parseColor('#ff7f00')).toEqual(Float32Array.from([1, 127 / 255, 0, 1]));
        expect(parseColor('ff7f00')).toEqual(Float32Array.from([1, 127 / 255, 0, 1]));

        /* Number array support */
        expect(parseColor(Float32Array.from([1, 2, 3, 4]))).toEqual(
            Float32Array.from([1, 2, 3, 4])
        );

        /* Number support */
        expect(parseColor(0xff00ff00)).toEqual(Float32Array.from([1, 0, 1, 0]));
        expect(parseColor(0xff7f00ff)).toEqual(Float32Array.from([1, 127 / 255, 0, 1]));

        /* short hex (#rgb) support */
        expect(parseColor('#f0f')).toEqual(Float32Array.from([1, 0, 1, 1]));
        expect(parseColor('f0f')).toEqual(Float32Array.from([1, 0, 1, 1]));

        /* uppercase hex should work the same */
        expect(parseColor('#FF7F00')).toEqual(Float32Array.from([1, 127 / 255, 0, 1]));

        /* 8-character hex with alpha */
        expect(parseColor('#11223344')).toEqual(
            Float32Array.from([17 / 255, 34 / 255, 51 / 255, 68 / 255])
        );

        /* number input with alpha (0xRRGGBBAA) */
        expect(parseColor(0x00ff0080)).toEqual(Float32Array.from([0, 1, 0, 128 / 255]));

        /* output array is filled and returned for string input */
        const out = new Float32Array(4);
        const ret = parseColor('#7f3300', out);
        expect(ret).toBe(out);
        expect(out).toEqual(Float32Array.from([127 / 255, 51 / 255, 0, 1]));

        /* output array is filled and returned for number input */
        const out2 = new Float32Array(4);
        const ret2 = parseColor(0xff112233, out2);
        expect(ret2).toBe(out2);
        expect(out2).toEqual(Float32Array.from([255 / 255, 17 / 255, 34 / 255, 51 / 255]));

        /* passing a Float32Array returns the same reference */
        const color = Float32Array.from([0.1, 0.2, 0.3, 0.4]);
        expect(parseColor(color)).toBe(color);

        /* invalid hex length should throw */
        expect(() => parseColor('#12')).toThrow();
        expect(() => parseColor('abcd')).toThrow();
    });
});
