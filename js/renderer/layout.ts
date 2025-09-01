import {
    Alignment,
    TextComponent,
    TextEffect,
    TextWrapMode,
    VerticalAlignment,
} from '@wonderlandengine/api';
import {
    Align,
    Display,
    Edge,
    FlexDirection,
    Gutter,
    Justify,
    Overflow,
    PositionType,
    Wrap,
    type Node as YogaNode,
} from 'yoga-layout/load';
import {
    computeTextScaleAndWrap,
    computeDimensionsFromBoundingBox,
    TEXT_BASE_SIZE,
    DEFAULT_FONT_SIZE,
} from './text-helpers.js';
import {setPositionCenter, setPositionLeft, setPositionRight} from './position-helpers.js';
import {computeMeshChildTransforms} from './mesh-transform-helpers.js';
import {buildRoundedRectangleMeshProps, buildNineSliceProps} from './mesh-helpers.js';
import {propsEqual} from './props-helpers.js';
import {roundedRectangle, roundedRectangleOutline} from '../rounded-rectangle-mesh.js';
import {nineSlice} from '../nine-slice.js';
import {NodeWrapper, Context} from './core.js';

/**
 * Layout and scene-graph application helpers.
 *
 * This module contains logic for converting Yoga layout results and
 * renderer props into runtime scene-graph updates (positioning, text
 * components, meshes, and child transforms). The functions are written to
 * remain testable: key exported helpers accept lightweight NodeWrapper and
 * Context objects and work with mocked Yoga nodes or scene objects in tests.
 */

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

    if (wrapper) wrapper.props = props;
}
