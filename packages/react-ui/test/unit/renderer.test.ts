import {describe, it, expect, beforeEach} from 'vitest';
import {
    applyLayoutToSceneGraph,
    applyToYogaNode,
    Context,
    NodeWrapper,
    ReactComp,
} from '../../js/renderer.js';
import {mock} from 'vitest-mock-extended';
import {Node} from 'yoga-layout/load';
import {Object3D, Scene, WonderlandEngine} from '@wonderlandengine/api';

describe('Renderer', () => {
    let mockContext: Context;
    let mockNodeWrapper: NodeWrapper;
    beforeEach(() => {
        mockContext = mock<Context>();
        mockContext.comp = mock<ReactComp>();
        mockContext.comp.object = mock<Object3D>();
        mockContext.comp.engine = mock<WonderlandEngine>();
        mockContext.comp.engine.scene = mock<Scene>();
        mockContext.comp.engine.scene.addObject = (obj: Object3D) => obj;

        mockNodeWrapper = mock<NodeWrapper>();
        mockNodeWrapper.node = mock<Node>();
        mockNodeWrapper.object = mock<Object3D>();
        mockNodeWrapper.parent = null;
        mockNodeWrapper.children = [];
    });

    describe('applyLayoutToSceneGraph', () => {
        it('should apply layout to scene graph nodes', () => {
            applyLayoutToSceneGraph(mockNodeWrapper, mockContext);
        });
    });

    describe('applyToYogaNode', () => {
        it('should apply properties to yoga node', () => {
            const tag = 'container';
            const node = mockNodeWrapper.node;
            const props = {
                width: 100,
                height: 200,
            };

            applyToYogaNode(tag, node, props, mockNodeWrapper, mockContext);

            expect(mockNodeWrapper.props).toEqual(props);
        });

        it('should apply events to yoga node', () => {
            const tag = 'container';
            const node = mockNodeWrapper.node;
            const props = {
                onHover: () => console.log('hover'),
                onUnhover: () => console.log('unhover'),
                onDown: () => console.log('down'),
                onUp: () => console.log('up'),
            };

            applyToYogaNode(tag, node, props, mockNodeWrapper, mockContext);

            expect(mockNodeWrapper.props).toEqual(props);
        });
    });
});
