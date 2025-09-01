import {describe, it, expect} from 'vitest';
import {
    propsEqual,
    setPositionCenter,
    setPositionLeft,
    setPositionRight,
} from '../../js/renderer-helpers';

// Minimal fake Object3D that records the last setPositionLocal call
class FakeObject3D {
    lastPos: number[] | null = null;
    parent: any = null;
    name: string = '';
    isDestroyed = false;
    setPositionLocal(pos: number[]) {
        this.lastPos = pos;
    }
    resetPositionRotation() {}
    resetScaling() {}
    setScalingLocal() {}
    findByNameDirect() {
        return [] as any;
    }
    getComponent() {
        return null as any;
    }
    addComponent() {
        return null as any;
    }
}

describe('renderer helpers', () => {
    it('propsEqual detects equality and inequality', () => {
        expect(propsEqual({a: 1, b: 2}, {a: 1, b: 2})).toBe(true);
        expect(propsEqual({a: 1}, {a: 1, b: 2})).toBe(false);
        expect(propsEqual({a: 1, b: 3}, {a: 1, b: 2})).toBe(false);
    });

    it('position setters set the expected positions', () => {
        // create a minimal node wrapper with a mock node that returns width/left/top
        const mockNode: any = {
            getComputedWidth: () => 200,
            getComputedLeft: () => 50,
            getComputedTop: () => 20,
        };

        const fakeCtx: any = {};

        const wrapper: any = {
            node: mockNode,
            props: {z: 0},
        };

        const o = new FakeObject3D() as any;

        setPositionLeft(o, wrapper, [1, 1]);
        expect(o.lastPos).toEqual([50, -20, 0.001]);

        setPositionCenter(o, wrapper, [1, 1]);
        expect(o.lastPos).toEqual([50 + 0.5 * 200, -20, 0.001]);

        setPositionRight(o, wrapper, [1, 1]);
        expect(o.lastPos).toEqual([50 + 200, -20, 0.001]);
    });
});
