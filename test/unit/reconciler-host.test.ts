import {describe, it, expect} from 'vitest';
import {__test_insertInContainerBefore} from '../../js/renderer/reconciler-host';
import {Context, NodeWrapper} from '../../js/renderer/core';

describe('reconciler host', () => {
    it('insertInContainerBefore sets root when inserting child', () => {
        // Minimal mock context with comp and engine required fields
        const fakeComp: any = {
            needsUpdate: false,
            engine: {scene: {addObject: () => ({})}},
        };
        // Create a bare Context by tricking the Y Config - create a minimal stub
        // We can avoid constructing real Yoga by mocking the Context partially
        const ctx: any = {
            root: null,
            comp: fakeComp,
            addNodeWrapper: () => {},
            removeNodeWrapper: () => {},
        };

        const child: any = {node: {}};
        __test_insertInContainerBefore(ctx, child as any, null);
        expect(ctx.root).toBe(child);
        expect(ctx.comp.needsUpdate).toBe(true);
    });
});
