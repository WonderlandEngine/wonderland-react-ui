import {
    Alignment,
    Collider,
    CollisionComponent,
    Component,
    Material,
    TextEffect,
    VerticalAlignment,
    ViewComponent,
    WonderlandEngine,
} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {mat4, vec3} from 'gl-matrix';
import type {ReactNode} from 'react';
import type {YogaNodeProps, ReactComp} from './renderer-types.js';
import {Object3D, TextComponent, TextWrapMode, Font} from '@wonderlandengine/api';

import {propsEqual} from './helpers/props-helpers.js';
import {version as reactVersion} from 'react';
import {
    COLLIDER_THICKNESS,
    debug,
    DEBUG_EVENTS,
    DEFAULT_FONT_SIZE,
    TEXT_BASE_SIZE,
} from './constants.js';
export type {
    ValueType,
    ValueTypeNoAuto,
    Color,
    YogaNodeProps,
    TextProps,
    RoundedRectangleProps,
    MeshProps,
    NineSliceProps,
    ReactComp,
} from './renderer-types.js';

/* These are used by props */
export {
    Align,
    Display,
    FlexDirection,
    Justify,
    Overflow,
    PositionType,
    Wrap,
} from 'yoga-layout/load';

/* These are used by the renderer only */
import {
    Yoga,
    Config,
    Node as YogaNode,
    MeasureMode,
    Align,
    Display,
    Edge,
    Direction,
    FlexDirection,
    Gutter,
    Justify,
    Overflow,
    PositionType,
    Wrap,
    loadYoga,
} from 'yoga-layout/load';

import {Cursor, CursorTarget, EventTypes} from '@wonderlandengine/components';

import Reconciler, {Fiber, HostConfig as HostConfigType} from 'react-reconciler';
import {
    buildNineSliceProps,
    buildRoundedRectangleMeshProps,
} from './helpers/mesh-helpers.js';
import {
    roundedRectangle,
    roundedRectangleOutline,
} from './components/rounded-rectangle-mesh.js';
import {
    computeDimensionsFromBoundingBox,
    computeTextScaleAndWrap,
} from './helpers/text-helpers.js';
import {nineSlice} from './components/nine-slice.js';
import {computeMeshChildTransforms} from './helpers/mesh-transform-helpers.js';
import {
    setPositionCenter,
    setPositionRight,
    setPositionLeft,
} from './helpers/position-helpers.js';

export enum UISpace {
    World = 0,
    Screen = 1,
}

export enum ScalingType {
    /**
     * The sizes absolute to the screen size. A pixel in the UI is a pixel on screen.
     * This is the default.
     */
    Absolute = 0,

    /**
     * The height of the UI will be fixed to the value set in the `manualHeight` property.
     */
    FixedHeight = 1,

    /**
     * The height of the UI will be fixed to the value set in the `manualHeight` property.
     * But if the width is below a certain threshold, the height will be scaled down anyway
     */
    FixedHeightLimitedWidth = 2,
}

const tempPos = [0, 0, 0];
const tempScale = [0, 0, 0];
const invProj = new Float32Array(16);
const topLeft = vec3.create();
const bottomRight = vec3.create();

const tempBBVec4 = new Float32Array(4);

export function computeTextDimensions(
    n: NodeWrapper,
    context: Context
): {width: number; height: number} {
    const o = n.object!;
    const t = o.getComponent(TextComponent)!;

    const {scale, wrapWidth} = computeTextScaleAndWrap(
        n.node.getComputedWidth(),
        n.props.fontSize,
        context.comp.scaling as [number, number],
        TEXT_BASE_SIZE,
        DEFAULT_FONT_SIZE
    );

    o.setScalingLocal([scale, scale, scale]);

    if (!isNaN(wrapWidth)) {
        t.wrapWidth = wrapWidth;
        t.getBoundingBoxForText(n.props.text, tempBBVec4);
        const {width, height} = computeDimensionsFromBoundingBox(
            tempBBVec4,
            scale,
            context.comp.scaling as [number, number]
        );
        return {width, height};
    }
    return {width: 0, height: 0};
}

export function applyLayoutToSceneGraph(n: NodeWrapper, context: Context, force?: boolean) {
    // replicate debug guard from original file (renderer.ts) if needed
    if (!force && !n.dirty && !n.node.hasNewLayout()) return;
    n.node.markLayoutSeen();

    if (n.object?.isDestroyed) n.object = null;
    const o =
        n.object ??
        (() => {
            if (n.parent?.object?.isDestroyed) n.parent.object = null;
            const o = context.comp.engine.scene.addObject(
                n.parent?.object ?? context.comp.object
            );
            return o;
        })();
    n.object = o;
    o.parent = n.parent?.object ?? context?.comp?.object;
    o.resetPositionRotation();
    o.resetScaling();

    if (n.tag === 'text3d') {
        const align = n.props.textAlign;
        let alignment = Alignment.Left;
        if (align === 'center') {
            setPositionCenter(o, n, context.comp.scaling);
            alignment = Alignment.Center;
        } else if (align === 'right') {
            setPositionRight(o, n, context.comp.scaling);
            alignment = Alignment.Right;
        } else {
            setPositionLeft(o, n, context.comp.scaling);
        }
        const wrap = n.props.textWrap;
        let textWrapMode = TextWrapMode.None;
        if (wrap === 'soft') {
            textWrapMode = TextWrapMode.Soft;
        } else if (wrap === 'hard') {
            textWrapMode = TextWrapMode.Hard;
        } else if (wrap === 'clip') {
            textWrapMode = TextWrapMode.Clip;
        }

        let t = o.getComponent(TextComponent);
        if (!t) {
            t = o.addComponent(TextComponent, {
                text: n.props.text,
                alignment,
                effect: TextEffect.Outline,
                verticalAlignment: VerticalAlignment.Top,
                wrapMode: textWrapMode,
                material: n.props.material ?? context.comp.textMaterial,
            });
        }
        const s =
            TEXT_BASE_SIZE *
            (n.props.fontSize ?? DEFAULT_FONT_SIZE) *
            context.comp.scaling[1];
        o.setScalingLocal([s, s, s]);

        t.material = n.props.material ?? context.comp.textMaterial;
        const ww = (n.node.getComputedWidth() * context.comp.scaling[0]) / s;

        if (!isNaN(ww)) {
            t.wrapWidth = ww;
        }
    } else {
        /* mesh and everything else */
        if (context && context.comp && context.comp.scaling) {
            setPositionLeft(o, n, context.comp.scaling);
        }
    }

    if (n.tag === 'mesh' || n.tag === 'roundedRectangle' || n.tag === 'nineSlice') {
        const child =
            o.findByNameDirect('mesh')[0] ??
            (() => {
                const child = context.comp.engine.scene.addObject(o);
                child.name = 'mesh';
                return child;
            })();

        let sw = n.node.getComputedWidth() * context.comp.scaling[0];
        let sh = n.node.getComputedHeight() * context.comp.scaling[1];

        if (isNaN(sw) || isNaN(sh)) {
            sw = 0;
            sh = 0;
        }
        const transforms = computeMeshChildTransforms(sw, sh, n.props.z, n.tag);

        const m = child.getComponent('mesh') ?? child.addComponent('mesh', {} as any);
        m.material = n.props.material;

        let mesh = m.mesh;
        if (n.tag === 'roundedRectangle') {
            const p = buildRoundedRectangleMeshProps(
                n.props,
                sw,
                sh,
                context.comp.scaling as [number, number]
            );
            const props = (m as any).roundedRectangleProps ?? {};
            const needsUpdate = !propsEqual(props, p);

            const borderSize = (n.props.borderSize ?? 0) * context.comp.scaling[0];
            if (needsUpdate) {
                mesh = roundedRectangle(
                    context.comp.engine,
                    p.sw,
                    p.sh,
                    p.rounding,
                    p.resolution,
                    {
                        tl: p.tl,
                        tr: p.tr,
                        bl: p.bl,
                        br: p.br,
                    },
                    mesh
                );
                (m as any).roundedRectangleProps = p;
            }

            const oldBorderSize = (m as any).borderSize ?? 0;
            const needsBorderMeshUpdate = oldBorderSize != borderSize;
            const bm =
                child.getComponent('mesh', 1) ?? child.addComponent('mesh', {} as any);
            bm.active = borderSize != 0;
            bm.material = n.props.borderMaterial;
            if (needsBorderMeshUpdate) {
                if (borderSize != 0) {
                    bm.mesh = roundedRectangleOutline(
                        context.comp.engine,
                        p.sw,
                        p.sh,
                        p.rounding,
                        p.resolution,
                        borderSize,
                        {
                            tl: p.tl,
                            tr: p.tr,
                            bl: p.bl,
                            br: p.br,
                        },
                        bm.mesh
                    );
                    (m as any).borderSize = borderSize;
                }
            }

            child.setPositionLocal(transforms.position);
            if (transforms.resetScaling) child.resetScaling();
        } else if (n.tag === 'nineSlice') {
            const p = buildNineSliceProps(
                n.props,
                sw,
                sh,
                context.comp.scaling as [number, number]
            );
            const props = (m as any).nineSliceProps ?? {};
            const needsUpdate = !propsEqual(props, p);

            if (needsUpdate) {
                mesh = nineSlice(
                    context.comp.engine,
                    p.sw,
                    p.sh,
                    p.borderSize,
                    p.borderTextureSize,
                    mesh
                );
                (m as any).nineSliceProps = p;
            }

            child.setPositionLocal(transforms.position);
            if (transforms.resetScaling) child.resetScaling();
        } else {
            child.setPositionLocal(transforms.position);
            if (transforms.scaling) child.setScalingLocal(transforms.scaling);
        }
        m.mesh = n.props.mesh ?? mesh;
    }

    n.children?.forEach((c) => {
        applyLayoutToSceneGraph(c, context, force);
        if (c.object && !c.object.isDestroyed) {
            c.object.parent = n.object;
        }
    });
}

export function applyToYogaNode(
    tag: string,
    node: YogaNode,
    props: any,
    wrapper: NodeWrapper,
    ctx?: Context
) {
    if (tag === 'text3d') {
        const p = props as any;
        let t = wrapper.object?.getComponent(TextComponent)!;
        if (!t) {
            wrapper.props.text = p.text;
            wrapper.props.textAlign = p.textAlign;
            wrapper.props.textWrap = p.textWrap;
            wrapper.props.material = p.material;
            applyLayoutToSceneGraph(wrapper, ctx!, true);
            t = wrapper.object?.getComponent(TextComponent)!;
        }
        if (t.text !== p.text) {
            t.text = p.text;
            node.markDirty();
        }
        node.setWidth(props.width);
        node.setHeight(props.height);
    } else {
        if (ctx) {
            applyLayoutToSceneGraph(wrapper, ctx, true);
        }
        node.setWidth(props.width);
        node.setHeight(props.height);
    }

    if (wrapper.props.alignContent !== props.alignContent)
        node.setAlignContent(props.alignContent ?? Align.FlexStart);
    if (wrapper.props.alignItems !== props.alignItems)
        node.setAlignItems(props.alignItems ?? Align.Stretch);
    if (wrapper.props.alignSelf !== props.alignSelf)
        node.setAlignSelf(props.alignSelf ?? Align.FlexStart);
    if (wrapper.props.aspectRatio !== props.aspectRatio)
        node.setAspectRatio(props.aspectRatio);

    if (wrapper.props.display !== props.display)
        node.setDisplay(props.display ?? Display.Flex);

    if (wrapper.props.flex !== props.flex) node.setFlex(props.flex);
    if (wrapper.props.flexDirection !== props.flexDirection)
        node.setFlexDirection(props.flexDirection ?? FlexDirection.Column);
    if (wrapper.props.flexBasis !== props.flexBasis) node.setFlexBasis(props.flexBasis);
    if (wrapper.props.flexGrow !== props.flexGrow) node.setFlexGrow(props.flexGrow);
    if (wrapper.props.flexShrink !== props.flexShrink) node.setFlexShrink(props.flexShrink);
    if (wrapper.props.flexWrap !== props.flexWrap)
        node.setFlexWrap(props.flexWrap ?? Wrap.NoWrap);

    if (wrapper.props.isReferenceBaseline !== props.isReferenceBaseline)
        node.setIsReferenceBaseline(props.isReferenceBaseline ?? false);

    if (wrapper.props.gap !== props.gap) node.setGap(Gutter.All, props.gap);
    if (wrapper.props.rowGap !== props.rowGap) node.setGap(Gutter.Row, props.rowGap);
    if (wrapper.props.columnGap !== props.columnGap)
        node.setGap(Gutter.Column, props.columnGap);

    if (wrapper.props.justifyContent !== props.justifyContent)
        node.setJustifyContent(props.justifyContent ?? Justify.FlexStart);

    if (wrapper.props.border !== props.border) node.setBorder(Edge.All, props.border);
    if (wrapper.props.borderTop !== props.borderTop)
        node.setBorder(Edge.Top, props.borderTop);
    if (wrapper.props.borderBottom !== props.borderBottom)
        node.setBorder(Edge.Bottom, props.borderBottom);
    if (wrapper.props.borderLeft !== props.borderLeft)
        node.setBorder(Edge.Left, props.borderLeft);
    if (wrapper.props.borderRight !== props.borderRight)
        node.setBorder(Edge.Right, props.borderRight);

    if (wrapper.props.margin !== props.margin) node.setMargin(Edge.All, props.margin);
    if (wrapper.props.marginTop !== props.marginTop)
        node.setMargin(Edge.Top, props.marginTop);
    if (wrapper.props.marginBottom !== props.marginBottom)
        node.setMargin(Edge.Bottom, props.marginBottom);
    if (wrapper.props.marginLeft !== props.marginLeft)
        node.setMargin(Edge.Left, props.marginLeft);
    if (wrapper.props.marginRight !== props.marginRight)
        node.setMargin(Edge.Right, props.marginRight);

    if (wrapper.props.maxHeight !== props.maxHeight) node.setMaxHeight(props.maxHeight);
    if (wrapper.props.maxWidth !== props.maxWidth) node.setMaxWidth(props.maxWidth);
    if (wrapper.props.minHeight !== props.minHeight) node.setMinHeight(props.minHeight);
    if (wrapper.props.minWidth !== props.minWidth) node.setMinWidth(props.minWidth);
    if (wrapper.props.overflow !== props.overflow)
        node.setOverflow(props.overflow ?? Overflow.Hidden);

    if (wrapper.props.padding !== props.padding) node.setPadding(Edge.All, props.padding);
    if (wrapper.props.paddingTop !== props.paddingTop)
        node.setPadding(Edge.Top, props.paddingTop);
    if (wrapper.props.paddingBottom !== props.paddingBottom)
        node.setPadding(Edge.Bottom, props.paddingBottom);
    if (wrapper.props.paddingLeft !== props.paddingLeft)
        node.setPadding(Edge.Left, props.paddingLeft);
    if (wrapper.props.paddingRight !== props.paddingRight)
        node.setPadding(Edge.Right, props.paddingRight);

    if (wrapper.props.position !== props.position)
        node.setPositionType(props.position ?? PositionType.Relative);
    if (wrapper.props.top !== props.top) node.setPosition(Edge.Top, props.top);
    if (wrapper.props.bottom !== props.bottom) node.setPosition(Edge.Bottom, props.bottom);
    if (wrapper.props.left !== props.left) node.setPosition(Edge.Left, props.left);
    if (wrapper.props.right !== props.right) node.setPosition(Edge.Right, props.right);

    wrapper.props = {...props};
}

/**
 * Host configuration object used by react-reconciler to map React operations
 * to Wonderland Engine scene graph operations.
 *
 * This object implements the host config callbacks required by the reconciler.
 * It is intentionally documented at a high level because individual callbacks
 * are already small and self-explanatory in the implementation.
 */
const HostConfig: HostConfigType<
    string,
    YogaNodeProps,
    Context,
    NodeWrapper,
    void,
    null,
    null,
    Object3D,
    Context,
    any,
    any,
    any,
    any
> = {
    getRootHostContext(context: Context) {
        return context;
    },
    getChildHostContext(parentHostContext: Context) {
        return parentHostContext;
    },
    shouldSetTextContent(tag: string) {
        return false;
    },
    createTextInstance(text: string, ctx: Context, hostContext: Context, node: ReactNode) {
        debug('createTextInstance', text, ctx, hostContext, node);
    },
    createInstance(tag: string, props: YogaNodeProps, ctx: Context) {
        debug('createInstance', tag, props, ctx);
        const node = yoga!.Node.create(ctx.config);
        const w = new NodeWrapper(ctx, node, tag);
        ctx.addNodeWrapper(w);

        if (tag === 'text3d') {
            node.setMeasureFunc(
                (
                    width: number,
                    widthMode: MeasureMode,
                    height: number,
                    heightMode: MeasureMode
                ): {
                    width: number;
                    height: number;
                } => {
                    const t = w.object?.getComponent(TextComponent);
                    if (t) {
                        const s =
                            TEXT_BASE_SIZE *
                            (w.props.fontSize ?? DEFAULT_FONT_SIZE) *
                            ctx.comp.scaling[1];

                        const ww = (width * ctx.comp.scaling[0]) / s;
                        t.wrapWidth = ww;
                        const bb = t.getBoundingBox();
                        const bbWidth = ((bb[2] - bb[0]) * s) / ctx.comp.scaling[0];
                        let bbHeight = ((bb[3] - bb[1]) * s) / ctx.comp.scaling[1];
                        const font = (t.material as any).getFont() as Font;

                        if (font) {
                            let h = 0;
                            h = (font.emHeight * s) / ctx.comp.scaling[1];
                            if (
                                h > bbHeight ||
                                t.wrapMode === TextWrapMode.None ||
                                t.wrapMode === TextWrapMode.Clip
                            ) {
                                bbHeight = h;
                            }
                        }

                        let calculatedWidth = 0;
                        if (widthMode === MeasureMode.Undefined) {
                            calculatedWidth = bbWidth;
                        } else if (widthMode === MeasureMode.Exactly) {
                            calculatedWidth = width;
                        } else if (widthMode === MeasureMode.AtMost) {
                            calculatedWidth = Math.min(bbWidth, width);
                        }

                        let calculatedHeight = 0;
                        if (heightMode === MeasureMode.Undefined) {
                            calculatedHeight = bbHeight;
                        } else if (heightMode === MeasureMode.Exactly) {
                            calculatedHeight = height;
                        } else if (heightMode === MeasureMode.AtMost) {
                            calculatedHeight = Math.min(bbHeight, height);
                        }

                        node.setHeight(calculatedHeight);
                        node.setWidth(calculatedWidth);
                        return {width: calculatedWidth, height: calculatedHeight};
                    } else {
                        return {width: width, height: height};
                    }
                }
            );
        }

        applyToYogaNode(tag, node, props, w, ctx);
        return w;
    },
    appendInitialChild(parent: NodeWrapper, child?: NodeWrapper) {
        debug('appendInitialChild', child, parent);
        if (!child) return;

        applyToYogaNode(child.tag, child.node, child.props, child);
        parent.node.insertChild(child.node, parent.node.getChildCount());

        child.parent = parent;
        parent.children!.push(child);

        parent.ctx!.comp.needsUpdate = true;
    },
    appendChild(parent: NodeWrapper, child?: NodeWrapper) {
        debug('appendChild', parent, child);
        if (!child) return;

        applyToYogaNode(child.tag, child.node, child.props, child);
        parent.node.insertChild(child.node, parent.node.getChildCount());

        child.parent = parent;
        parent.children!.push(child);

        parent.ctx!.comp.needsUpdate = true;
    },
    appendChildToContainer(ctx: Context, child?: NodeWrapper) {
        debug('appendChildToContainer', ctx, child);
        if (!child) return;
        ctx.root = child;
        ctx.comp.needsUpdate = true;
    },
    insertInContainerBefore(
        container: Context,
        child: NodeWrapper | undefined,
        beforeChild: NodeWrapper | undefined
    ) {
        debug('insertContainerBefore', container, child, beforeChild);
        if (!child) return;
        // When inserting into the root container, set the root and mark for update
        container.root = child;
        container.comp.needsUpdate = true;
    },
    insertBefore(parent: NodeWrapper, child: NodeWrapper | undefined, before: NodeWrapper) {
        debug('insertBefore', parent, child, before);
        if (!child) return;

        applyToYogaNode(child.tag, child.node, child.props, child);

        const beforeIndex = parent.children.findIndex((childNode) => childNode === before);
        const insertIndex = beforeIndex !== -1 ? beforeIndex : parent.children.length;
        parent.node.insertChild(child.node, insertIndex);
        parent.children.splice(insertIndex, 0, child);

        child.parent = parent;

        parent.ctx!.comp.needsUpdate = true;
    },
    removeChild(parent: NodeWrapper, child?: NodeWrapper) {
        debug('removeChild', parent, child);
        if (!child) return;
        destroyTreeForNode(child, parent.ctx!);

        parent.ctx!.comp.needsUpdate = true;
    },
    removeChildFromContainer(ctx: Context, child?: NodeWrapper) {
        debug('removeChildFromContainer', ctx, child);
        if (!child) return;
        destroyTreeForNode(child, ctx);
    },
    finalizeInitialChildren(
        instance: NodeWrapper,
        tag: string,
        props: YogaNodeProps,
        ctx: Context,
        hostContext: Context
    ) {
        debug('finalizeInitialChildren', instance, tag);
        return false;
    },
    prepareForCommit(ctx: Context) {
        debug('prepareForCommit');
        return null;
    },
    resetAfterCommit(containerInfo: Context) {
        debug('resetAfterCommit', containerInfo);
    },
    commitUpdate(
        instance: NodeWrapper,
        updatePayload: null,
        type: string,
        prevProps: YogaNodeProps,
        nextProps: YogaNodeProps,
        internalHandle
    ) {
        debug('commitUpdate');
        instance.props = nextProps;
        instance.dirty = true;
        applyToYogaNode(instance.tag, instance.node, instance.props, instance);

        instance.ctx!.comp.needsUpdate = true;
    },
    prepareUpdate(
        instance: NodeWrapper,
        tag: string,
        oldProps: YogaNodeProps,
        newProps: YogaNodeProps,
        rootContainer: Context,
        hostContext: Context
    ) {
        debug('prepareUpdate', oldProps, newProps);
        if (propsEqual(oldProps, newProps)) return null;
        return {};
    },
    getPublicInstance(instance: NodeWrapper) {
        return instance.object!;
    },
    afterActiveInstanceBlur() {},
    beforeActiveInstanceBlur() {},
    detachDeletedInstance(node: any) {},
    getCurrentEventPriority() {
        return 0;
    },
    getInstanceFromNode(node: any) {
        return null;
    },
    clearContainer(ctx) {
        debug('clearContainer', ctx);
        if (!ctx.root) return;
        destroyTreeForNode(ctx.root, ctx);
        ctx.root = null;
    },
    getInstanceFromScope(scopeInstance: any) {
        debug('getInstanceFromScope', scopeInstance);
        return null;
    },
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    supportsMutation: true,
    supportsHydration: false,
    supportsPersistence: false,
    isPrimaryRenderer: false,
    noTimeout: -1,
    preparePortalMount(containerInfo: any) {},
    prepareScopeUpdate(scopeInstance: any, instance: any) {},
};

/**
 * The reconciler instance created from the HostConfig.
 *
 * This is the primary entrypoint used by the renderer implementation to create
 * React containers and drive updates into the Wonderland Engine scene.
 */
export const reconcilerInstance = Reconciler(HostConfig);

/**
 * Public renderer interface used by the package.
 */
export interface Renderer {
    /**
     * The root container created by react-reconciler.
     */
    rootContainer: Reconciler.OpaqueRoot;

    /**
     * Unmount the current root container, if any.
     *
     * This will update the reconciler with a null root to remove all mounted nodes.
     */
    unmountRoot: () => void;

    /**
     * Render a React element tree into the provided ReactComp context.
     *
     * @param element - The React element or tree to render.
     * @param reactComp - The ReactComp instance that provides engine context.
     * @param callback - Optional callback invoked after reconciliation completes.
     */
    render: (element: ReactNode, reactComp: ReactComp, callback?: () => void) => void;
}

/**
 * Recursively destroy a NodeWrapper subtree and free underlying resources.
 *
 * This function assumes wrappers and their .node fields are valid and that the
 * caller can safely mutate the tree. It will null out parent/child links on
 * the destroyed wrapper.
 *
 * @param child - The root of the subtree to destroy.
 * @param ctx - The Context that owns this wrapper (used for cleanup).
 */
export function destroyTreeForNode(child: NodeWrapper, ctx: Context) {
    const childCount = child.children.length ?? 0;
    for (let c = childCount - 1; c >= 0; --c) {
        destroyTreeForNode(child.children[c], ctx);
    }

    if (child.parent) {
        const parent = child.parent;
        parent.node.removeChild(child.node);
        parent.children.splice(parent.children.indexOf(child)!, 1);
        child.parent = null;
    }
    child.node.free();

    if (child.object && !child.object.isDestroyed) {
        child.object.destroy();
    }
    child.object = null;

    child.ctx?.removeNodeWrapper(child);
}

/**
 * Small wrapper object that pairs a Yoga node with runtime metadata.
 *
 * NodeWrapper instances are lightweight containers used by the renderer to
 * maintain layout nodes, applied props, an optional rendered object reference,
 * and tree structure information (parent/children). They are stored in a
 * Context so they can be queried and cleaned up later.
 */
export class NodeWrapper {
    /** The underlying Yoga node used for layout calculations. */
    node: YogaNode;
    /** A short tag/name used for debugging and tree printing. */
    tag: string;
    /** Applied properties cache (style/props applied to this node). */
    props: any = {};
    /** Optional runtime object produced by the renderer (e.g. scene object). */
    object: any | null = null;
    /** Parent wrapper in the tree, or null for the root. */
    parent: NodeWrapper | null = null;
    /** Ordered list of child wrappers. */
    children: NodeWrapper[] = [];
    /** Owning Context instance. */
    ctx: Context;
    /** Hover state for mouse/pointer handling (internal two-slot boolean). */
    hovering = [false, false];
    /** Dirty flag indicating that layout/props need to be re-applied. */
    dirty = true;

    /**
     * Construct a NodeWrapper.
     *
     * @param ctx - Owning Context.
     * @param node - The Yoga node associated with this wrapper.
     * @param tag - A short debug tag for the node.
     */
    constructor(ctx: Context, node: YogaNode, tag: string) {
        this.ctx = ctx;
        this.tag = tag;
        this.node = node;
    }
}

/**
 * Context holds renderer-global state for a particular root tree.
 *
 * Each Context creates a Yoga Config (using the shared {@link yoga})
 * and maintains a registry of NodeWrapper instances created for that tree.
 * The Context is intentionally small: it provides registration helpers and a
 * lightweight tree-printing utility used for debugging.
 */
export class Context {
    root: NodeWrapper | null;
    config: Config;
    comp: any;
    wrappers: NodeWrapper[] = [];
    constructor(c: ReactComp, yoga: Yoga) {
        this.root = null;
        this.comp = c;

        // The shared Yoga instance is set by the loader/initializer.
        // We assume it exists when a Context is constructed via initializeRenderer.
        this.config = yoga.Config.create();
        this.config.setUseWebDefaults(false);
        this.config.setPointScaleFactor(1);
    }

    /** Register a NodeWrapper with this Context. */
    addNodeWrapper(w: NodeWrapper) {
        this.wrappers.push(w);
        w.ctx = this;
    }

    /** Remove a NodeWrapper from this Context's registry. */
    removeNodeWrapper(w: NodeWrapper) {
        const i = this.wrappers.indexOf(w);
        this.wrappers.splice(i, 1);
    }

    /**
     * Print the tree to the console for lightweight debugging.
     *
     * The output shows the node tag, computed layout rectangle, and the props
     * cache. The format is intentionally minimal; host modules may provide
     * richer debugging facilities.
     *
     * @param node - Optional starting node (defaults to the Context root).
     * @param prefix - Optional string prefix used for indentation when
     * printing recursively.
     */
    printTree(node?: NodeWrapper, prefix?: string) {
        node = node ?? this.root!;
        prefix = prefix ?? '';

        const yn = node.node;
        // Keep printing lightweight; real debug is provided by the host
        // module that imports this core.
        // eslint-disable-next-line no-console
        console.log(
            prefix + node.tag,
            `{${yn.getComputedLeft()}, ${yn.getComputedTop()}, ${yn.getComputedWidth()}, ${yn.getComputedHeight()}}`,
            node.props
        );
        if (!node.children) return;
        for (let n of node.children) {
            this.printTree(n, prefix + '--');
        }
    }

    computeUIBounds(): {minX: number; maxX: number; minY: number; maxY: number} {
        if (!this.root) return {minX: 0, maxX: 0, minY: 0, maxY: 0};

        const rootLeft = this.root.node.getComputedLeft();
        const rootTop = this.root.node.getComputedTop();
        const rootWidth = this.root.node.getComputedWidth();
        const rootHeight = this.root.node.getComputedHeight();

        let minX = rootLeft,
            maxX = rootLeft + rootWidth,
            minY = rootTop,
            maxY = rootTop + rootHeight;

        const traverse = (node: NodeWrapper) => {
            const left = node.node.getComputedLeft();
            const top = node.node.getComputedTop();
            const width = node.node.getComputedWidth();
            const height = node.node.getComputedHeight();

            if (isNaN(left) || isNaN(top) || isNaN(width) || isNaN(height)) {
                throw new Error('Context.computeUIBounds: Invalid layout values detected');
            }
            minX = Math.min(minX, left);
            maxX = Math.max(maxX, left + width);
            minY = Math.min(minY, top);
            maxY = Math.max(maxY, top + height);

            node.children.forEach(traverse);
        };

        traverse(this.root);
        return {minX, maxX, minY, maxY};
    }
}

export abstract class ReactUiBase extends Component implements ReactComp {
    static TypeName = 'react-ui-base';

    @property.enum(['world', 'screen'])
    space = 0;

    /* Material from which all text materials will be cloned */
    @property.material({required: true})
    textMaterial!: Material;

    /* Material from which all panel materials will be cloned */
    @property.material({required: true})
    panelMaterial!: Material;

    /* Textured material from which all panel materials will be cloned,
     * e.g. for Image */
    @property.material({required: true})
    panelMaterialTextured!: Material;

    @property.int(100)
    width = 100;
    @property.int(100)
    height = 100;

    @property.enum(
        Object.keys(ScalingType).filter((e) => isNaN(Number(e))),
        ScalingType.Absolute
    )
    scalingMode: ScalingType = ScalingType.Absolute;

    @property.float(1080)
    manualHeight = 1080;

    @property.float(1080)
    manualWidth = 1080;

    /**
     * Device pixel ratio, defaults to 1. Used on mobile/tablet devices to scale.
     */
    dpr = 1;

    get pixelSizeAdjustment() {
        switch (this.scalingMode) {
            case ScalingType.FixedHeight:
                return this.manualHeight / this.engine.canvas.height;
            case ScalingType.FixedHeightLimitedWidth:
                const factor = this.engine.canvas.height / this.manualHeight;

                if (this.engine.canvas.width / factor < this.manualWidth) {
                    return this.manualWidth / this.engine.canvas.width;
                } else {
                    return this.manualHeight / this.engine.canvas.height;
                }
            default:
                return 1;
        }
    }

    private _colliderObject?: Object3D;

    static onRegister(engine: WonderlandEngine) {
        engine.registerComponent(CursorTarget);
    }

    _onViewportResize = () => {
        /* This callback is only added if space is "screen" */

        const activeView = this.engine.scene.activeViews[0];
        if (!activeView) return;
        /* Projection matrix will change if the viewport is resized, which will affect the
         * projection matrix because of the aspect ratio. */
        mat4.invert(invProj, activeView.projectionMatrix);

        vec3.transformMat4(topLeft, [-1, 1, 0], invProj);
        vec3.transformMat4(bottomRight, [1, -1, 0], invProj);

        const s = bottomRight[0] - topLeft[0];
        this.object.setScalingLocal([s, s, s]);
        /* Convert from yoga units to 0-1 */
        this.dpr = window.devicePixelRatio;
        this.width = this._dpiAdjust(this.engine.canvas.clientWidth);
        this.height = this._dpiAdjust(this.engine.canvas.clientHeight);
        this.scaling = [1 / this.width, 1 / this.width];
        this.object.setPositionLocal(topLeft);
        this.needsUpdate = true;
        this.viewportChanged = true;
    };

    scaling = [0.01, 0.01];

    renderer?: Renderer;

    ctx: Context | null = null;

    protected _viewComponent?: ViewComponent;

    needsUpdate = true;
    viewportChanged = true;

    setContext(c: Context): void {
        this.ctx = c;
    }

    updateLayout() {
        if (!this.ctx?.root) return;

        debug('updateLayout', this.width, this.height);
        this.ctx.wrappers.forEach((w) => applyToYogaNode(w.tag, w.node, w.props, w));
        this.ctx.root.node.calculateLayout(
            this.width ?? 100,
            this.height ?? 100,
            Direction.LTR
        );

        applyLayoutToSceneGraph(this.ctx.root, this.ctx!, this.viewportChanged);

        if (this.space === UISpace.World && this._colliderObject) {
            const bounds = this.ctx.computeUIBounds();
            const width = bounds.maxX - bounds.minX;
            const height = bounds.maxY - bounds.minY;
            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;

            const rootScaling = this.object.getScalingWorld(tempScale);

            // Adjust for scaling
            const scaledWidth = width * this.scaling[0];
            const scaledHeight = height * this.scaling[1];
            const scaledCenterX = centerX * this.scaling[0];
            const scaledCenterY = -centerY * this.scaling[1]; // Flip Y for Wonderland coords

            // Update collider position (center of bounds)
            this._colliderObject.setPositionLocal([
                scaledCenterX,
                scaledCenterY,
                COLLIDER_THICKNESS / 2,
            ]);

            // Update extents (half-size)
            const collision = this._colliderObject.getComponent(CollisionComponent)!;
            const extents = new Float32Array(3);

            extents[0] = 0.5 * scaledWidth * rootScaling[0]; // Half-width, scaled
            extents[1] = 0.5 * scaledHeight * rootScaling[1]; // Half-height, scaled
            extents[2] = COLLIDER_THICKNESS; // Keep fixed depth

            collision.extents.set(extents);
        }

        this.needsUpdate = false;
    }

    init() {
        /* We need to ensure React defers re-renders to after the callbacks were called */
        const onMove = this.onMove;
        this.onMove = (e: any) => reconcilerInstance.batchedUpdates(onMove, e);
        const onClick = this.onClick;
        this.onClick = (e: any) => reconcilerInstance.batchedUpdates(onClick, e);
        const onUp = this.onUp;
        this.onUp = (e: any) => reconcilerInstance.batchedUpdates(onUp, e);
        const onDown = this.onDown;
        this.onDown = (e: any) => reconcilerInstance.batchedUpdates(onDown, e);

        this.callbacks = {
            click: this.onPointerClick.bind(this),
            pointermove: this.onPointerMove.bind(this),
            pointerdown: this.onPointerDown.bind(this),
            pointerup: this.onPointerUp.bind(this),
        };
    }

    async start() {
        if (this.space == UISpace.Screen) {
            this._viewComponent = this.engine.scene.activeViews[0];
            /* Reparent to main view */
            this.object.parent = this._viewComponent.object;
            this.object.setPositionLocal([0, 0, -2 * this._viewComponent.near]);
            this.object.resetRotation();

            /* Calculate size of the UI */
            this._onViewportResize();
        }
        this.renderer = await initializeRenderer();
        this.renderer.render(this.render(), this);
    }

    update(dt: number | undefined = undefined) {
        if (this.needsUpdate) {
            this.updateLayout();
        }
    }

    callbacks: Record<string, any> = {};

    getCursorPosition(c: Cursor): [number, number] {
        this.object.transformPointInverseWorld(tempPos, c.cursorPos);
        this.object.getScalingWorld(tempScale);
        return [
            tempPos[0] / this.scaling[0] / tempScale[0],
            -tempPos[1] / this.scaling[1] / tempScale[1],
        ];
    }

    override onActivate(): void {
        if (this.space == UISpace.World) {
            this._colliderObject =
                this.object.findByNameDirect('UIColliderObject')[0] ??
                (() => {
                    const o = this.engine.scene.addObject(this.object);
                    o.name = 'UIColliderObject';
                    o.addComponent(CursorTarget);
                    o.addComponent(CollisionComponent, {
                        collider: Collider.Box,
                        group: 0xff,
                    });
                    return o;
                })();
            const target = this._colliderObject.getComponent(CursorTarget)!;
            const collision = this._colliderObject.getComponent(CollisionComponent)!;
            target.onClick.add(
                (_, c, e) => {
                    const [x, y] = this.getCursorPosition(c as Cursor);
                    this.onClick({x, y, e: e!});
                },
                {id: 'onClick'}
            );
            target.onMove.add(
                (_, c, e) => {
                    const [x, y] = this.getCursorPosition(c as Cursor);
                    this.onMove({x, y, e});
                },
                {id: 'onMove'}
            );
            target.onUp.add(
                (_, c, e) => {
                    const [x, y] = this.getCursorPosition(c as Cursor);
                    this.onUp({x, y, e: e!});
                },
                {id: 'onUp'}
            );
            target.onDown.add(
                (_, c, e) => {
                    const [x, y] = this.getCursorPosition(c as Cursor);
                    this.onDown({x, y, e: e!});
                },
                {id: 'onDown'}
            );

            const extents = this.object.getScalingWorld(new Float32Array(3));
            extents[0] *= 0.5 * this.width * this.scaling[0];
            extents[1] *= 0.5 * this.height * this.scaling[1];
            extents[2] = COLLIDER_THICKNESS;
            collision.extents.set(extents);

            this._colliderObject.setPositionLocal([
                this.width * 0.5 * this.scaling[0],
                -this.height * 0.5 * this.scaling[1],
                0.025,
            ]);
        } else {
            this.engine.onResize.add(this._onViewportResize);
            for (const [k, v] of Object.entries(this.callbacks)) {
                this.engine.canvas.addEventListener(k, v);
            }
        }
    }

    override onDeactivate(): void {
        if (this.space == UISpace.World) {
            if (!this._colliderObject) return;
            const target = this._colliderObject.getComponent(CursorTarget)!;
            if (!target) return;
            // FIXME: We might be able to just deactivate the target here instead?
            target.onClick.remove('onClick');
            target.onMove.remove('onMove');
            target.onUp.remove('onUp');
            target.onDown.remove('onDown');
        } else {
            this.engine.onResize.remove(this._onViewportResize);
            if (!this._viewComponent) return;
            const canvas = this.engine.canvas!;

            for (const [k, v] of Object.entries(this.callbacks)) {
                canvas.removeEventListener(k, v);
            }
        }
    }

    override onDestroy(): void {
        this.renderer?.unmountRoot();
    }

    forEachElementUnderneath(
        node: NodeWrapper | null,
        x: number,
        y: number,
        callback: (node: NodeWrapper) => boolean
    ): NodeWrapper | null {
        if (node === null) return null;

        const t = node.node.getComputedTop();
        const l = node.node.getComputedLeft();
        const w = node.node.getComputedWidth();
        const h = node.node.getComputedHeight();

        const inside = !(x > l + w || x < l || y > t + h || y < t);
        let target = null;
        if (inside) {
            node.hovering![this.curGen] = true;
            if (callback(node)) target = node;
        }

        for (let n of node.children!) {
            target = this.forEachElementUnderneath(n, x - l, y - t, callback) ?? target;
        }

        return target;
    }

    emitEvent(eventName: string, x: number, y: number, e: Event): NodeWrapper | null {
        if (!this.ctx?.root) return null;
        const target = this.forEachElementUnderneath(this.ctx.root, x, y, (w) => {
            const event = w?.props[eventName];
            if (event !== undefined) {
                event({x, y, e});
                return true;
            }
            return false;
        });
        if (DEBUG_EVENTS) {
            debug(eventName, `{${x}, ${y}}`, target);
            this.ctx!.printTree();
        }
        return target;
    }

    /** 'pointermove' event listener */
    curGen = 0;
    onPointerMove(e: PointerEvent) {
        /* Don't care about secondary pointers */
        if (!e.isPrimary) return null;
        const x = this._dpiAdjust(e.clientX);
        const y = this._dpiAdjust(e.clientY);
        this.onMove({x, y, e});
    }

    onMove = ({x, y, e}: {x: number; y: number; e: any}) => {
        if (!this.ctx) return null;

        const cur = (this.curGen = this.curGen ^ 0x1);
        /* Clear hovering flag */
        this.ctx.wrappers.forEach((w) => (w.hovering![cur] = false));
        const target = this.emitEvent('onMove', x, y, e);
        this.updateHoverState(x, y, e, target!);
    };

    updateHoverState(x: number, y: number, e: PointerEvent, node?: NodeWrapper | null) {
        const cur = this.curGen;
        const other = cur ^ 0x1;
        while (node) {
            node.hovering![cur] = true;
            node = node.parent;
        }
        this.ctx!.wrappers.forEach((w) => {
            const hovering = w.hovering![cur];
            if (hovering != w.hovering![other]) {
                const event = hovering ? w?.props.onHover : w?.props.onUnhover;
                if (event !== undefined) {
                    event({x, y, e});
                    return true;
                }
            }
        });
    }

    /** 'click' event listener */
    onClick = (e: {x: number; y: number; e: EventTypes}) => {
        const t = this.emitEvent('onClick', e.x, e.y, e.e);
        return t;
    };

    onDown = (e: {x: number; y: number; e: EventTypes}) => {
        const t = this.emitEvent('onDown', e.x, e.y, e.e);
        return t;
    };

    onUp = (e: {x: number; y: number; e: EventTypes}) => {
        const t = this.emitEvent('onUp', e.x, e.y, e.e);
        return t;
    };

    onPointerClick(e: PointerEvent) {
        const x = this._dpiAdjust(e.clientX);
        const y = this._dpiAdjust(e.clientY);
        this.onClick({x, y, e});
    }

    /** 'pointerdown' event listener */
    onPointerDown(e: PointerEvent): NodeWrapper | null {
        /* Don't care about secondary pointers or non-left clicks */
        if (!e.isPrimary || e.button !== 0) return null;
        const x = this._dpiAdjust(e.clientX);
        const y = this._dpiAdjust(e.clientY);
        return this.onDown({x, y, e});
    }

    /** 'pointerup' event listener */
    onPointerUp(e: PointerEvent): NodeWrapper | null {
        /* Don't care about secondary pointers or non-left clicks */
        if (!e.isPrimary || e.button !== 0) return null;
        const x = this._dpiAdjust(e.clientX);
        const y = this._dpiAdjust(e.clientY);
        return this.onUp({x, y, e});
    }

    renderCallback() {
        // FIXME: Never called
        this.needsUpdate = true;
    }

    private _dpiAdjust(value: number) {
        return value * this.pixelSizeAdjustment * this.dpr;
    }

    abstract render(): ReactNode;
}

/** The Yoga API instance used to create and configure layouts.
 *
 */
let yoga: Yoga | null = null;

let yogaInitializationPromise: Promise<void> | null = null;

type yogaRenderer = {
    rootContainer: Reconciler.OpaqueRoot;
    unmountRoot(): void;
    render(element: ReactNode, reactComp: ReactComp, callback?: () => void): void;
};

export async function initializeRenderer() {
    if (!yoga) {
        if (!yogaInitializationPromise) {
            yogaInitializationPromise = loadYoga().then((loadedYoga) => {
                yoga = loadedYoga;
            });
        }

        await yogaInitializationPromise;
    }
    return {
        rootContainer: null,
        unmountRoot() {
            reconcilerInstance.updateContainer(null, this.rootContainer);
        },
        render(element: ReactNode, reactComp: ReactComp, callback?: () => void) {
            const container = reconcilerInstance.createContainer(
                new Context(reactComp, yoga!),
                0,
                null,
                false,
                null,
                'root',
                (e: Error) => console.error(e),
                null
            );
            this.rootContainer = container;
            reactComp.setContext(container.containerInfo);

            const parentComponent = null;
            reconcilerInstance.updateContainer(
                element,
                container,
                parentComponent,
                reactComp.renderCallback.bind(reactComp)
            );
            reconcilerInstance.injectIntoDevTools({
                bundleType: 0,
                version: '0.2.1',
                rendererPackageName: 'wonderlandengine/react-ui',
            });
        },
    };
}
