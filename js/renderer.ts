import {
    Alignment,
    Collider,
    CollisionComponent,
    Component,
    Font,
    Material,
    Mesh,
    Object3D,
    TextComponent,
    TextEffect,
    Texture,
    VerticalAlignment,
    ViewComponent,
    WonderlandEngine,
} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {mat4, vec3} from 'gl-matrix';
import {ReactNode} from 'react';

import Reconciler, {HostConfig} from 'react-reconciler';
import type {
    Yoga,
    Config,
    Node as YogaNode,
    /* We want to defer initializing the web assembly until
     * the renderer is initialized. The only way we found was
     * to import the files directly */
} from 'yoga-layout/load';

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

import {roundedRectangle, roundedRectangleOutline} from './rounded-rectangle-mesh.js';
import {Cursor, CursorTarget, EventTypes} from '@wonderlandengine/components';
import {nineSlice} from './nine-slice.js';

type ValueType = number | 'auto' | `${number}%`;
type ValueTypeNoAuto = number | `${number}%`;

const Z_INC = 0.001;
const TEXT_BASE_SIZE = 12;
const DEFAULT_FONT_SIZE = 50;

let Y: Yoga | null = null;

export interface YogaNodeProps {
    height?: ValueType;
    width?: ValueType;

    alignContent?: Align;
    alignItems?: Align;
    alignSelf?: Align;
    justifyContent?: Justify;

    aspectRatio?: number;
    display?: Display;

    flex?: number;
    flexDirection?: FlexDirection;
    flexGrow?: number;
    flexBasis?: ValueType;
    flexShrink?: number;
    flexWrap?: Wrap;

    isReferenceBaseline?: boolean;

    gap?: number;
    columnGap?: number;
    rowGap?: number;

    border?: number;
    borderTop?: number;
    borderBottom?: number;
    borderLeft?: number;
    borderRight?: number;

    margin?: ValueType;
    marginTop?: ValueType;
    marginBottom?: ValueType;
    marginLeft?: ValueType;
    marginRight?: ValueType;

    maxHeight?: ValueTypeNoAuto;
    maxWidth?: ValueTypeNoAuto;

    minHeight?: ValueTypeNoAuto;
    minWidth?: ValueTypeNoAuto;

    overflow?: Overflow;

    padding?: ValueTypeNoAuto;
    paddingTop?: ValueTypeNoAuto;
    paddingBottom?: ValueTypeNoAuto;
    paddingLeft?: ValueTypeNoAuto;
    paddingRight?: ValueTypeNoAuto;

    /* Relative z value to add to the usual increment, to allow widgets to render on top/behind other widgets */
    z?: number;

    top?: ValueTypeNoAuto;
    left?: ValueTypeNoAuto;
    right?: ValueTypeNoAuto;
    bottom?: ValueTypeNoAuto;
    position?: PositionType;

    onClick?: (e: {x: number; y: number; e: MouseEvent}) => void;
    onUp?: (e: {x: number; y: number; e: PointerEvent}) => void;
    onDown?: (e: {x: number; y: number; e: PointerEvent}) => void;
    onMove?: (e: {x: number; y: number; e: PointerEvent}) => void;
    onHover?: (e: {x: number; y: number; e: PointerEvent}) => void;
    onUnhover?: (e: {x: number; y: number; e: PointerEvent}) => void;
}

/**
 * Properties for text components
 */
export interface TextProps extends YogaNodeProps {
    text?: string;
    fontSize?: number;
    material?: Material | null;
    textAlign?: 'left' | 'center' | 'right';
}

/**
 * Properties for roundedRectangle components
 */
export interface RoundedRectangleProps extends YogaNodeProps {
    /* Material for the rounded rectangle mesh */
    material?: Material | null;
    /* Material for the rounded rectangle border */
    borderMaterial?: Material | null;
    /* Rounding in pixel-like units */
    rounding?: number;
    /* Rounding resolution */
    resolution?: number;
    roundTopLeft?: boolean;
    roundTopRight?: boolean;
    roundBottomLeft?: boolean;
    roundBottomRight?: boolean;
}

/**
 * Properties for mesh components
 */
export interface MeshProps extends YogaNodeProps {
    material?: Material | null;
    mesh?: Mesh | null;
}

/**
 * Properties for nineSlice components
 */
export interface NineSliceProps extends YogaNodeProps {
    material?: Material | null;
    texture?: Texture | null;
    borderSize?: number;
    borderTextureSize?: number;
}

function destroyTreeForNode(child: NodeWrapper, ctx: Context) {
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

function propsEqual(oldProps: any, newProps: any) {
    const oldKeys = Object.keys(oldProps as any);
    const newKeys = Object.keys(newProps as any);
    if (oldKeys.length !== newKeys.length) return false;

    for (const k of oldKeys) {
        if (oldProps[k] != newProps[k]) {
            return false;
        }
    }
    return true;
}

class NodeWrapper {
    node: YogaNode;
    tag: string;
    /* Applied properties cache */
    props: any = {};
    object: Object3D | null = null;
    parent: NodeWrapper | null = null;
    children: NodeWrapper[] = [];
    ctx: Context;
    hovering = [false, false];
    dirty = true;

    constructor(ctx: Context, node: YogaNode, tag: string) {
        this.ctx = ctx;
        this.tag = tag;
        this.node = node;
    }
}

class Context {
    root: NodeWrapper | null;
    config: Config;
    comp: ReactComp;
    wrappers: NodeWrapper[] = [];
    constructor(c: ReactComp) {
        this.root = null;
        this.comp = c;

        this.config = Y!.Config.create();
        this.config.setUseWebDefaults(false);
        this.config.setPointScaleFactor(1);
    }

    addNodeWrapper(w: NodeWrapper) {
        this.wrappers.push(w);
        w.ctx = this;
    }
    removeNodeWrapper(w: NodeWrapper) {
        const i = this.wrappers.indexOf(w);
        this.wrappers.splice(i, 1);
    }

    printTree(node?: NodeWrapper, prefix?: string) {
        node = node ?? this.root!;
        prefix = prefix ?? '';

        const yn = node.node;
        debug(
            prefix + node.tag,
            `{${yn.getComputedLeft()}, ${yn.getComputedTop()}, ${yn.getComputedWidth()}, ${yn.getComputedHeight()}}`,
            node.props
        );
        if (!node.children) return;
        for (let n of node.children) {
            this.printTree(n, prefix + '--');
        }
    }
}

function setPositionCenter(o: Object3D, n: NodeWrapper, s: number[]) {
    o.setPositionLocal([
        (n.node.getComputedLeft() + 0.5 * n.node.getComputedWidth()) * s[0],
        -n.node.getComputedTop() * s[1],
        Z_INC + (n.props.z ?? 0),
    ]);
}

function setPositionLeft(o: Object3D, n: NodeWrapper, s: number[]) {
    o.setPositionLocal([
        n.node.getComputedLeft() * s[0],
        -n.node.getComputedTop() * s[1],
        Z_INC + (n.props.z ?? 0),
    ]);
}

function setPositionRight(o: Object3D, n: NodeWrapper, s: number[]) {
    // n.node.getComputedRight() was giving 0;
    o.setPositionLocal([
        (n.node.getComputedLeft() + n.node.getComputedWidth()) * s[0],
        -n.node.getComputedTop() * s[1],
        Z_INC + (n.props.z ?? 0),
    ]);
}

function applyLayoutToSceneGraph(n: NodeWrapper, context: Context, force?: boolean) {
    debug('applyLayoutToSceneGraph');
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

        const s =
            TEXT_BASE_SIZE *
            (n.props.fontSize ?? DEFAULT_FONT_SIZE) *
            context.comp.scaling[1];
        o.setScalingLocal([s, s, s]);

        const t =
            o.getComponent('text') ??
            o.addComponent('text', {
                alignment,
                effect: TextEffect.Outline,
                verticalAlignment: VerticalAlignment.Top,
            });
        t.material = n.props.material ?? context.comp.textMaterial;
        if (t.text !== n.props.text) t.text = n.props.text;
    } else {
        /* "mesh" and everything else */
        if (context && context.comp && context.comp.scaling) {
            setPositionLeft(o, n, context.comp.scaling);
        }
    }

    if (n.tag === 'mesh' || n.tag === 'roundedRectangle' || n.tag === 'nineSlice') {
        /* To offset the mesh, but avoid offsetting the children,
         * we need to add a child object */
        const child =
            o.findByNameDirect('mesh')[0] ??
            (() => {
                const child = context.comp.engine.scene.addObject(o);
                child.name = 'mesh';
                return child;
            })();

        let sw = n.node.getComputedWidth() * context.comp.scaling[0];
        let sh = n.node.getComputedHeight() * context.comp.scaling[1];

        // there is a change that on the first time the code is executed getComputedWidth
        // and getComputedHeight return NaN. In that case we set the values to 0 to prevent
        // any more issues.
        if (isNaN(sw) || isNaN(sh)) {
            sw = 0;
            sh = 0;
        }
        const centerX = 0.5 * sw;
        const centerY = -0.5 * sh;

        const m = child.getComponent('mesh') ?? child.addComponent('mesh', {});
        m.material = n.props.material;

        let mesh = m.mesh;
        if (n.tag === 'roundedRectangle') {
            const p = {
                sw,
                sh,
                rounding: (n.props.rounding ?? 30) * context.comp.scaling[0],
                resolution: n.props.resolution ?? 4,
                tl: n.props.roundTopLeft ?? true,
                tr: n.props.roundTopRight ?? true,
                bl: n.props.roundBottomLeft ?? true,
                br: n.props.roundBottomRight ?? true,
            };
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
            const bm = child.getComponent('mesh', 1) ?? child.addComponent('mesh', {});
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

            child.setPositionLocal([centerX, centerY, Z_INC + (n.props.z ?? 0)]);
            child.resetScaling();
        } else if (n.tag === 'nineSlice') {
            const p = {
                sw,
                sh,
                borderTextureSize: n.props.borderTextureSize ?? 0,
                borderSize: (n.props.borderSize ?? 0) * context.comp.scaling[0],
            };
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

            child.setPositionLocal([centerX, centerY, Z_INC + (n.props.z ?? 0)]);
            child.resetScaling();
        } else {
            /* Planes are diameter of 2 */
            child.setPositionLocal([centerX, centerY, Z_INC + (n.props.z ?? 0)]);
            child.setScalingLocal([0.5 * sw, 0.5 * sh, 0.5 * sw]);
        }
        m.mesh = n.props.mesh ?? mesh;
    }

    /* For children created earlier  */
    n.children?.forEach((c) => {
        applyLayoutToSceneGraph(c, context, force);
        if (c.object && !c.object.isDestroyed) {
            c.object.parent = n.object;
        }
    });
}

const tempVec4 = new Float32Array(4);

function applyToYogaNode(
    tag: string,
    node: YogaNode,
    props: YogaNodeProps | TextProps | RoundedRectangleProps | MeshProps | NineSliceProps,
    wrapper: NodeWrapper,
    ctx?: Context
) {
    if (tag === 'text3d') {
        const p = props as TextProps;
        const s = TEXT_BASE_SIZE * (p.fontSize ?? DEFAULT_FONT_SIZE);

        let t = wrapper.object?.getComponent(TextComponent);
        if (!t) {
            /* Apply properties relevant to text component here */
            wrapper.props.text = p.text;
            wrapper.props.textAlign = p.textAlign;
            applyLayoutToSceneGraph(wrapper, ctx!, true);
            t = wrapper.object?.getComponent(TextComponent)!;
        }

        // TODO: Avoid all the computation when width and height is set
        let h: ValueType = 0;
        const b = t.getBoundingBoxForText(p.text?.toString() ?? '', tempVec4);

        if (props.height) {
            h = props.height;
        } else {
            const font = (t.material as any).getFont() as Font;
            if (font) {
                h = font.capHeight * s;
            } else {
                h = s * (b[3] - b[1]);
            }
        }

        // when alighment is left or right, the width is the width of the text
        // when alignment is center, the width is the width of the container
        let w;
        if (p.textAlign === 'left' || p.textAlign === 'right') {
            w = props.width ?? s * (b[2] - b[0]);
        } else {
            w = props.width;
        }
        node.setHeight(h);
        node.setWidth(w);
    } else {
        if (ctx) {
            applyLayoutToSceneGraph(wrapper, ctx, true);
        } else {
            debug('Context is undefined, skipping applyLayoutToSceneGraph');
        }
        node.setWidth(props.width);
        node.setHeight(props.height);
    }

    /* Properties that allow undefined should be assigned to `undefined`,
     *
     * Properties that have a default value and do not allow `undefined` should be
     * assigned the default value if props.value is `undefined`. */

    if (wrapper.props.alignContent !== props.alignContent)
        node.setAlignContent(props.alignContent ?? Align.FlexStart);
    if (wrapper.props.alignItems !== props.alignItems)
        node.setAlignItems(props.alignItems ?? Align.Stretch);
    if (wrapper.props.alignSelf !== props.alignSelf)
        // TODO This default was not documented!
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

    if (wrapper) wrapper.props = props;
}

const DEBUG_RENDERER = false;
const DEBUG_EVENTS = false;
const debug = DEBUG_RENDERER ? console.log : () => {};

const HostConfig: HostConfig<
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
        const node = Y!.Node.create(ctx.config);
        const w = new NodeWrapper(ctx, node, tag);
        ctx.addNodeWrapper(w);

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

    insertInContainerBefore(container, child: NodeWrapper | undefined, beforeChild) {
        debug('insertContainerBefore', parent, child, beforeChild);
        if (child === undefined) return;
    },
    insertBefore(parent: NodeWrapper, child: NodeWrapper | undefined, before: NodeWrapper) {
        debug('insertBefore', parent, child, before);
        if (!child) return;

        applyToYogaNode(child.tag, child.node, child.props, child);

        // Find the index of the 'before' node to determine the position at which to insert the new node
        const beforeIndex = parent.children.findIndex((childNode) => childNode === before);
        if (beforeIndex !== -1) {
            parent.node.insertChild(child.node, beforeIndex);
        }

        child.parent = parent;

        // We also need to insert the child in the correct position in the parent's children array
        if (beforeIndex !== -1) {
            parent.children.splice(beforeIndex, 0, child);
        } else {
            // If the 'before' node is not found, we will append the child by default.
            parent.children.push(child);
        }

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
const reconcilerInstance = Reconciler(HostConfig);

type ReactComp = Component & {
    needsUpdate: boolean;
    textMaterial: Material;
    scaling: number[];
    renderCallback: () => void;
    callbacks: Record<string, any>;

    setContext(c: Context): void;
    updateLayout(): void;
    render(): ReactNode;
};

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

    static onRegister(engine: WonderlandEngine) {
        engine.registerComponent(CursorTarget);
    }

    _onViewportResize = () => {
        /* This callback is only added if space is "screen" */

        const activeView = this.engine.scene.activeViews[0];
        if (!activeView) return;
        /* Projection matrix will change if the viewport is resized, which will affect the
         * projection matrix because of the aspect ratio. */
        const invProj = new Float32Array(16);
        mat4.invert(invProj, activeView.projectionMatrix);

        const topLeft = vec3.create();
        const bottomRight = vec3.create();
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

    renderer?: any;

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
            this.engine.onResize.add(this._onViewportResize);
        }
        this.renderer = await initializeRenderer();

        this.renderer.render(this.render(), this);
    }

    update(dt: number | undefined = undefined) {
        if (this.needsUpdate) this.updateLayout();
    }

    callbacks: Record<string, any> = {};

    getCursorPosition(c: Cursor): [number, number] {
        const pos = [0, 0, 0];
        const scale = [0, 0, 0];
        this.object.transformPointInverseWorld(pos, c.cursorPos);
        this.object.getScalingWorld(scale);
        return [pos[0] / this.scaling[0] / scale[0], -pos[1] / this.scaling[1] / scale[1]];
    }

    override onActivate(): void {
        if (this.space == UISpace.World) {
            const colliderObject =
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
            const target = colliderObject.getComponent(CursorTarget)!;
            const collision = colliderObject.getComponent(CollisionComponent)!;
            target.onClick.add(
                (_, c, e) => {
                    const [x, y] = this.getCursorPosition(c);
                    this.onClick({x, y, e: e!});
                },
                {id: 'onClick'}
            );
            target.onMove.add(
                (_, c, e) => {
                    const [x, y] = this.getCursorPosition(c);
                    this.onMove({x, y, e});
                },
                {id: 'onMove'}
            );
            target.onUp.add(
                (_, c, e) => {
                    const [x, y] = this.getCursorPosition(c);
                    this.onUp({x, y, e: e!});
                },
                {id: 'onUp'}
            );
            target.onDown.add(
                (_, c, e) => {
                    const [x, y] = this.getCursorPosition(c);
                    this.onDown({x, y, e: e!});
                },
                {id: 'onDown'}
            );

            const extents = this.object.getScalingWorld(new Float32Array(3));
            extents[0] *= 0.5 * this.width * this.scaling[0];
            extents[1] *= 0.5 * this.height * this.scaling[1];
            extents[2] = 0.05;
            collision.extents.set(extents);

            colliderObject.setPositionLocal([
                this.width * 0.5 * this.scaling[0],
                -this.height * 0.5 * this.scaling[1],
                0.025,
            ]);
        } else {
            for (const [k, v] of Object.entries(this.callbacks)) {
                this.engine.canvas.addEventListener(k, v);
            }
        }
    }

    override onDeactivate(): void {
        if (this.space == UISpace.World) {
            const colliderObject = this.object.findByNameDirect('UIColliderObject')[0];
            if (!colliderObject) return;
            const target = colliderObject.getComponent(CursorTarget)!;
            if (!target) return;
            // FIXME: We might be able to just deactivate the target here instead?
            target.onClick.remove('onClick');
            target.onMove.remove('onMove');
            target.onUp.remove('onUp');
            target.onDown.remove('onDown');
        } else {
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
let yogaInitializationPromise: Promise<void> | null = null;

export async function initializeRenderer() {
    if (!Y) {
        if (!yogaInitializationPromise) {
            yogaInitializationPromise = loadYoga().then((loadedYoga) => {
                Y = loadedYoga;
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
                new Context(reactComp),
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
