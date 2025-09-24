import {describe, it, expect, beforeEach, vi} from 'vitest';
import {
    applyLayoutToSceneGraph,
    applyToYogaNode,
    Context,
    NodeWrapper,
    ReactComp,
} from '../../js/renderer.js';
import {mock} from 'vitest-mock-extended';
import {Config, Node, Yoga} from 'yoga-layout/load';
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

describe('Context', () => {
    describe('constructor', () => {
        it('should create a Context instance', () => {
            const mockComp = mock<ReactComp>();
            const mockYoga = mock<Yoga>();
            const mockConfig = mock<Config>();
            mockYoga.Config.create = vi.fn(() => mockConfig);
            const context = new Context(mockComp, mockYoga);
            expect(context).toBeInstanceOf(Context);
            expect(context.comp).toBe(mockComp);
            expect(mockYoga.Config.create).toHaveBeenCalled();
            expect(context.config).toBe(mockConfig);
        });
    });

    describe('computeUIBounds', () => {
        it('should compute UI bounds', () => {
            const mockComp = mock<ReactComp>();
            const mockYoga = mock<Yoga>();
            const mockConfig = mock<Config>();
            mockYoga.Config.create = vi.fn(() => mockConfig);
            const context = new Context(mockComp, mockYoga);
            context.root = mock<NodeWrapper>();
            context.root.children = [];
            context.root.node = mock<Node>();

            const minX = 10;
            const minY = 20;
            const width = 30;
            const height = 40;

            context.root.node.getComputedLeft = vi.fn(() => minX);
            context.root.node.getComputedTop = vi.fn(() => minY);
            context.root.node.getComputedWidth = vi.fn(() => width);
            context.root.node.getComputedHeight = vi.fn(() => height);

            const bounds = context.computeUIBounds();

            expect(bounds.minX).toEqual(minX);
            expect(bounds.maxX).toEqual(minX + width);
            expect(bounds.minY).toEqual(minY);
            expect(bounds.maxY).toEqual(minY + height);
        });

        it('should handle NaN with an error', () => {
            const mockComp = mock<ReactComp>();
            const mockYoga = mock<Yoga>();
            const mockConfig = mock<Config>();
            mockYoga.Config.create = vi.fn(() => mockConfig);
            const context = new Context(mockComp, mockYoga);
            context.root = mock<NodeWrapper>();
            context.root.children = [];
            context.root.node = mock<Node>();

            const minX = NaN;
            const minY = NaN;
            const width = NaN;
            const height = NaN;

            context.root.node.getComputedLeft = vi.fn(() => minX);
            context.root.node.getComputedTop = vi.fn(() => minY);
            context.root.node.getComputedWidth = vi.fn(() => width);
            context.root.node.getComputedHeight = vi.fn(() => height);

            expect(() => {
                context.computeUIBounds();
            }).toThrowError('Context.computeUIBounds: Invalid layout values detected');
        });
    });
});
