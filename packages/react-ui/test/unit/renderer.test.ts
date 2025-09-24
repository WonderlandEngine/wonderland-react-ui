import {describe, it, expect, beforeEach, vi} from 'vitest';
import {
    applyLayoutToSceneGraph,
    applyToYogaNode,
    Context,
    NodeWrapper,
    ReactComp,
    applyTextLayout,
} from '../../js/renderer.js';
import {mock} from 'vitest-mock-extended';
import {Config, Node, Wrap, Yoga} from 'yoga-layout/load';
import {
    Alignment,
    Object3D,
    Scene,
    TextComponent,
    TextEffect,
    TextWrapMode,
    WonderlandEngine,
} from '@wonderlandengine/api';

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

    describe('applyTextLayout', () => {
        it('should apply text layout to yoga node', () => {
            const props = {
                text: 'Hello World',
                fontSize: 24,
                textAlign: 'center',
                textWrap: 'soft',
                textEffect: 'shadow',
                textEffectColor: '#ff0000',
                textEffectOffset: {x: 0.1, y: -0.1},
            };
            mockNodeWrapper.props = props;
            const obj = mockNodeWrapper.object;

            const textComp = mock<TextComponent>();
            obj.addComponent = vi.fn((_, x) => {
                textComp.text = x.text;
                textComp.alignment = x.alignment;
                textComp.effect = x.effect;
                textComp.effectOffset = x.effectOffset;
                textComp.verticalAlignment = x.verticalAlignment;
                textComp.wrapMode = x.wrapMode;
                textComp.material = x.material;
                return textComp;
            });

            applyTextLayout(mockNodeWrapper, obj, mockContext);

            expect(textComp.text).toBe(props.text);
            expect(textComp.alignment).toBe(Alignment.Center);
            expect(textComp.wrapMode).toBe(TextWrapMode.Soft);
            expect(textComp.effect).toBe(TextEffect.Shadow);
            expect(textComp.effectOffset).toEqual([0.1, -0.1]);
        });

        it('should set effect offset to 0,0 when array too long', () => {
            const props = {
                textEffectOffset: [1, 2, 3],
            };
            mockNodeWrapper.props = props;
            const obj = mockNodeWrapper.object;

            const textComp = mock<TextComponent>();
            obj.addComponent = vi.fn((_, x) => {
                textComp.effectOffset = x.effectOffset;

                return textComp;
            });

            applyTextLayout(mockNodeWrapper, obj, mockContext);

            expect(textComp.effectOffset).toEqual([0, 0]);
        });

        it('should set effect offset to 0,0 when type incorrect', () => {
            const props = {
                textEffectOffset: 'invalid',
            };
            mockNodeWrapper.props = props;
            const obj = mockNodeWrapper.object;

            const textComp = mock<TextComponent>();
            obj.addComponent = vi.fn((_, x) => {
                textComp.effectOffset = x.effectOffset;

                return textComp;
            });

            applyTextLayout(mockNodeWrapper, obj, mockContext);

            expect(textComp.effectOffset).toEqual([0, 0]);
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
});
