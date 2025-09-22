import {describe, it, expect} from 'vitest';
import {propsEqual} from '../../js/helpers/props-helpers';

describe('Props Helpers', () => {
    describe('propsEqual', () => {
        it('detects equality and inequality', () => {
            expect(propsEqual({a: 1, b: 2}, {a: 1, b: 2})).toBe(true);
            expect(propsEqual({a: 1}, {a: 1, b: 2})).toBe(false);
            expect(propsEqual({a: 1, b: 3}, {a: 1, b: 2})).toBe(false);
        });
    });
});
