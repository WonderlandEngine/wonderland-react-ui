import {describe, it, expect, beforeAll, vi} from 'vitest';
import {yoga, setYoga, Context, NodeWrapper, destroyTreeForNode} from '../../js/core/core';

describe('core module', () => {
    // Prepare a fake Yoga instance that exposes Config.create() used by Context
    const setUseWebDefaults = vi.fn();
    const setPointScaleFactor = vi.fn();
    const createConfig = vi.fn(() => ({
        setUseWebDefaults,
        setPointScaleFactor,
    }));

    const fakeYoga: any = {
        Config: {
            create: createConfig,
        },
    };

    beforeAll(() => {
        // Ensure the shared Yoga instance is set for Context construction
        setYoga(fakeYoga as any);
    });

    it('setYoga sets the shared Yoga instance only once', () => {
        // first set happened in beforeAll; calling setYoga again should be a no-op
        const other: any = {Config: {create: () => ({})}};
        setYoga(other);
        // yoga should still be the fakeYoga we provided
        expect(yoga).toBe(fakeYoga);
    });

    it('Context constructor uses yoga.Config.create and config methods', () => {
        const ctx = new Context({});
        // create should have been called to produce the config
        expect(createConfig).toHaveBeenCalled();
        // Context ctor should call the config setters with expected values
        expect(setUseWebDefaults).toHaveBeenCalledWith(false);
        expect(setPointScaleFactor).toHaveBeenCalledWith(1);
    });

    it('destroyTreeForNode removes node from parent, frees nodes, destroys objects, and removes from context', () => {
        const ctx = new Context({});

        // Create fake Yoga node implementations with the methods used by core.ts
        const rootNode = {
            removeChild: vi.fn(),
            free: vi.fn(),
            getComputedLeft: () => 0,
            getComputedTop: () => 0,
            getComputedWidth: () => 10,
            getComputedHeight: () => 10,
        } as any;

        const childNode = {
            removeChild: vi.fn(),
            free: vi.fn(),
            getComputedLeft: () => 1,
            getComputedTop: () => 1,
            getComputedWidth: () => 5,
            getComputedHeight: () => 5,
        } as any;

        const grandChildNode = {
            removeChild: vi.fn(),
            free: vi.fn(),
            getComputedLeft: () => 2,
            getComputedTop: () => 2,
            getComputedWidth: () => 2,
            getComputedHeight: () => 2,
        } as any;

        const parentWrapper = new NodeWrapper(ctx as any, rootNode, 'parent');
        const childWrapper = new NodeWrapper(ctx as any, childNode, 'child');
        const grandChildWrapper = new NodeWrapper(ctx as any, grandChildNode, 'grandchild');

        // hook up tree
        parentWrapper.children.push(childWrapper);
        childWrapper.parent = parentWrapper;

        childWrapper.children.push(grandChildWrapper);
        grandChildWrapper.parent = childWrapper;

        // add wrappers to context registry so removeNodeWrapper will remove them
        ctx.addNodeWrapper(parentWrapper);
        ctx.addNodeWrapper(childWrapper);
        ctx.addNodeWrapper(grandChildWrapper);

        // attach objects with destroy behavior
        const destroyedFlags: Record<string, boolean> = {};
        childWrapper.object = {
            isDestroyed: false,
            destroy: () => (destroyedFlags.child = true),
        } as any;
        grandChildWrapper.object = {
            isDestroyed: false,
            destroy: () => (destroyedFlags.grandchild = true),
        } as any;

        // Now destroy starting at child - should recursively destroy grandchild first
        destroyTreeForNode(childWrapper, ctx);

        // parent should have had removeChild called with child's node
        expect(rootNode.removeChild).toHaveBeenCalledWith(childNode);
        // child and grandchild nodes should have been freed
        expect(childNode.free).toHaveBeenCalled();
        expect(grandChildNode.free).toHaveBeenCalled();
        // attached objects should have been destroyed
        expect(destroyedFlags.child).toBe(true);
        expect(destroyedFlags.grandchild).toBe(true);
        // child should have been removed from parent's children array
        expect(parentWrapper.children.indexOf(childWrapper)).toBe(-1);
        // context registry should no longer include the child or grandchild
        expect(ctx.wrappers.indexOf(childWrapper)).toBe(-1);
        expect(ctx.wrappers.indexOf(grandChildWrapper)).toBe(-1);
    });
});
