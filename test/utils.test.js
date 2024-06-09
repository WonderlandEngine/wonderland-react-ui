import {expect} from '@esm-bundle/chai';
import {parseColor} from '../dist/utils.js';

describe('Utils', () => {
    it('parseColor', () => {
        /* hex string RGBA support */
        expect(parseColor('#ff00ff00')).to.deep.equal(Float32Array.from([1, 0, 1, 0]));
        expect(parseColor('ff00ff00')).to.deep.equal(Float32Array.from([1, 0, 1, 0]));
        /* hex string RGB support */
        expect(parseColor('#ff7f00')).to.deep.equal(
            Float32Array.from([1, 127 / 255, 0, 1])
        );
        expect(parseColor('ff7f00')).to.deep.equal(Float32Array.from([1, 127 / 255, 0, 1]));

        /* Number array support */
        expect(parseColor([1, 2, 3, 4])).to.deep.equal([1, 2, 3, 4]);

        /* Number support */
        expect(parseColor(0xff00ff00)).to.deep.equal(Float32Array.from([1, 0, 1, 0]));
        expect(parseColor(0xff7f00ff)).to.deep.equal(
            Float32Array.from([1, 127 / 255, 0, 1])
        );
    });
});
