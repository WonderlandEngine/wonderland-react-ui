import {describe, it, expect, vi, beforeEach} from 'vitest';
import {applyToYogaNode} from '../../js/renderer/layout';
import {NodeWrapper, Context, setYoga} from '../../js/renderer/core';

// Minimal fake Yoga Node providing setters used by applyToYogaNode
function createFakeYogaNode() {
    return {
        setWidth: vi.fn(),
        setHeight: vi.fn(),
        setAlignContent: vi.fn(),
        setAlignItems: vi.fn(),
        setAlignSelf: vi.fn(),
        setAspectRatio: vi.fn(),
        setDisplay: vi.fn(),
        setFlex: vi.fn(),
        setFlexDirection: vi.fn(),
        setFlexBasis: vi.fn(),
        setFlexGrow: vi.fn(),
        setFlexShrink: vi.fn(),
        setFlexWrap: vi.fn(),
        setIsReferenceBaseline: vi.fn(),
        setGap: vi.fn(),
        setJustifyContent: vi.fn(),
        setBorder: vi.fn(),
        setMargin: vi.fn(),
        setMaxHeight: vi.fn(),
        setMaxWidth: vi.fn(),
        setMinHeight: vi.fn(),
        setMinWidth: vi.fn(),
        setOverflow: vi.fn(),
        setPadding: vi.fn(),
        setPositionType: vi.fn(),
        setPosition: vi.fn(),
        markDirty: vi.fn(),
        hasNewLayout: vi.fn().mockReturnValue(true),
        markLayoutSeen: vi.fn(),
        getComputedLeft: vi.fn(() => 0),
        getComputedTop: vi.fn(() => 0),
        getComputedWidth: vi.fn(() => 0),
        getComputedHeight: vi.fn(() => 0),
    } as any;
}

describe('layout.applyToYogaNode', () => {
    beforeEach(() => {
        // Ensure a minimal Yoga.Config is available for Context
        const fakeYoga: any = {
            Config: {
                create: () => ({
                    setUseWebDefaults: () => {},
                    setPointScaleFactor: () => {},
                }),
            },
        };
        setYoga(fakeYoga);
    });

    it('sets width and height on node and updates wrapper.props', () => {
        const node = createFakeYogaNode();
        const wrapper = new NodeWrapper({} as any, node, 'div');
        // Do not provide a real Context for this simple test; passing a
        // Context would cause applyLayoutToSceneGraph to try to access
        // scene/engine functions. We only want to assert width/height set.
        const props = {width: 123, height: 45};
        applyToYogaNode('div', node, props, wrapper);

        expect(node.setWidth).toHaveBeenCalledWith(123);
        expect(node.setHeight).toHaveBeenCalledWith(45);
        expect(wrapper.props).toBe(props);
    });

    it('for text3d creates text component when missing and sets node width/height', () => {
        // Create a fake object that will be attached to wrapper.object by applyLayout
        const node = createFakeYogaNode();
        const wrapper = new NodeWrapper({} as any, node, 'text3d');

        // Minimal fake context and component to satisfy applyLayoutToSceneGraph
        const fakeTextComp = {
            wrapWidth: 0,
            getBoundingBoxForText: () => {},
        };

        // store components keyed by the component identifier passed to addComponent
        const compMap = new Map<any, any>();
        function createFakeSceneObject() {
            return {
                getComponent: (t: any) => compMap.get(t),
                addComponent: (t: any, opts: any) => {
                    compMap.set(t, fakeTextComp);
                    return fakeTextComp;
                },
                setScalingLocal: () => {},
                setPositionLocal: () => {},
                resetPositionRotation: () => {},
                resetScaling: () => {},
                findByNameDirect: () => [],
                parent: null,
                name: '',
            } as any;
        }

        const fakeComp: any = {
            engine: {scene: {addObject: () => createFakeSceneObject()}},
            scaling: [1, 1],
            textMaterial: {},
        };
        const ctx = new Context(fakeComp);

        const props = {
            width: 10,
            height: 20,
            text: 'hello',
            textAlign: 'left',
            textWrap: 'soft',
        };
        applyToYogaNode('text3d', node, props, wrapper, ctx);

        expect(node.setWidth).toHaveBeenCalledWith(10);
        expect(node.setHeight).toHaveBeenCalledWith(20);
        expect(wrapper.props.text).toBe('hello');
    });
});
