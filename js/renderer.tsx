import {
  Alignment,
  Component,
  Material,
  Mesh,
  Object3D,
  TextComponent,
  TextEffect,
  VerticalAlignment,
  ViewComponent,
} from "@wonderlandengine/api";
import { property } from "@wonderlandengine/api/decorators.js";
import { mat4, vec3 } from "gl-matrix";
import React, { ReactNode } from "react";
import Reconciler, { HostConfig } from "react-reconciler";
import type Yoga from "yoga-layout";

import { roundedRectangle } from "./rounded-rectangle-mesh.js";

export enum PositionType {
  Static = 0,
  Relative = 1,
  Absolute = 2,
}

export enum FlexDirection {
  Column = 0,
  ColumnReverse = 1,
  Row = 2,
  RowReverse = 3,
}

export enum Justify {
  FlexStart = 0,
  Center = 1,
  FlexEnd = 2,
  SpaceBetween = 3,
  SpaceAround = 4,
  SpaceEvenly = 5,
}

export enum Align {
  Auto = 0,
  FlexStart = 1,
  Center = 2,
  FlexEnd = 3,
  Stretch = 4,
  Baseline = 5,
  SpaceBetween = 6,
  SpaceAround = 7,
  SpaceEvenly = 8,
}

export enum Display {
  Flex = 0,
  None = 1,
}

export enum Overflow {
  Visible = 0,
  Hidden = 1,
  Scroll = 2,
}

export enum Wrap {
  NoWrap = 0,
  Wrap = 1,
  WrapReverse = 2,
}

let Y: typeof Yoga | null = null;
type YogaNode = typeof Yoga.Node;
type YogaConfig = typeof Yoga.Config;

type ValueType = number | "auto" | `${number}%`;
type ValueTypeNoAuto = number | "auto" | `${number}%`;

const Z_INC = 0.001;
const TEXT_BASE_SIZE = 14;
const DEFAULT_FONT_SIZE = 50;

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

  top?: ValueTypeNoAuto;
  left?: ValueTypeNoAuto;
  right?: ValueTypeNoAuto;
  bottom?: ValueTypeNoAuto;
  position?: PositionType;

  onClick?: (e: { x: number; y: number; e: MouseEvent }) => void;
  onUp?: (e: { x: number; y: number; e: PointerEvent }) => void;
  onDown?: (e: { x: number; y: number; e: PointerEvent }) => void;
  onMove?: (e: { x: number; y: number; e: PointerEvent }) => void;
  onHover?: (e: { x: number; y: number; e: PointerEvent }) => void;
  onUnhover?: (e: { x: number; y: number; e: PointerEvent }) => void;
}

function destroyTreeForNode(child: NodeWrapper, ctx: Context) {
  const childCount = child.children?.length ?? 0;
  for (let c = childCount - 1; c >= 0; --c) {
    destroyTreeForNode(child.children![c], ctx);
  }

  if (child.parent) {
    const parent = child.parent;
    parent.node.removeChild(child.node);
    parent.children!.splice(parent.children?.indexOf(child)!, 1);
    child.parent = null;
  }
  child.node.free();

  if (child.object && !child.object.isDestroyed) {
    child.object.destroy();
  }
  delete child.object;

  child.ctx?.removeNodeWrapper(child);
}

function propsEqual(oldProps: YogaNodeProps, newProps: YogaNodeProps) {
  const oldKeys = Object.keys(oldProps);
  const newKeys = Object.keys(newProps);
  if (oldKeys.length !== newKeys.length) return false;

  for (const k of oldKeys) {
    if (
      oldProps[k as any as keyof YogaNodeProps] !=
      newProps[k as any as keyof YogaNodeProps]
    ) {
      return false;
    }
  }
  return true;
}

class Context {
  root: NodeWrapper | null;
  config: YogaConfig;
  comp: ReactComp;
  wrappers: NodeWrapper[] = [];
  constructor(c: ReactComp) {
    this.root = null;
    this.comp = c;

    this.config = Y.default.Config.create();
    this.config.setUseWebDefaults(false);
    this.config.setPointScaleFactor(1);
  }

  addNodeWrapper(w: NodeWrapper) {
    w.children = w.children ?? [];
    w.hovering = [false, false];
    this.wrappers.push(w);
    w.ctx = this;
  }
  removeNodeWrapper(w: NodeWrapper) {
    const i = this.wrappers.indexOf(w);
    this.wrappers.splice(i, 1);
  }

  printTree(node?: NodeWrapper, prefix?: string) {
    node = node ?? this.root!;
    prefix = prefix ?? "";

    const yn = node.node;
    debug(
      prefix + node.tag,
      `{${yn.getComputedLeft()}, ${yn.getComputedTop()}, ${yn.getComputedWidth()}, ${yn.getComputedHeight()}}`,
      node.props
    );
    if (!node.children) return;
    for (let n of node.children) {
      this.printTree(n, prefix + "--");
    }
  }
}

function setPositionCenter(o: Object3D, n: YogaNode, s: number[]) {
  o.setPositionLocal([
    (n.node.getComputedLeft() + 0.5 * n.node.getComputedWidth()) * s[0],
    -(n.node.getComputedTop() + 0.5 * n.node.getComputedHeight()) * s[1],
    Z_INC,
  ]);
}

function setPositionLeft(o: Object3D, n: YogaNode, s: number[]) {
  o.setPositionLocal([
    n.node.getComputedLeft() * s[0],
    -n.node.getComputedTop() * s[1],
    Z_INC,
  ]);
}

function setPositionRight(o: Object3D, n: YogaNode, s: number[]) {
  o.setPositionLocal([
    n.node.getComputedRight() * s[0],
    -n.node.getComputedTop() * s[1],
    Z_INC,
  ]);
}

interface NodeWrapper {
  node: YogaNode;
  tag: string;
  props: any;
  object?: Object3D;
  parent?: NodeWrapper | null;
  children?: NodeWrapper[];
  ctx?: Context;
  hovering?: boolean[];
  dirty?: boolean;
}

function applyLayoutToSceneGraph(
  n: NodeWrapper,
  context: Context,
  force?: boolean
) {
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
  o.parent = n.parent?.object ?? context.comp.object;

  if (n.tag === "text") {
    const align = n.props.alignment;
    let alignment = Alignment.Left;
    if (align === "center") {
      setPositionCenter(o, n, context.comp.scaling);
      alignment = Alignment.Center;
    } else if (align === "right") {
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
      o.getComponent("text") ??
      o.addComponent("text", {
        alignment,
        effect: TextEffect.Outline,
        verticalAlignment: VerticalAlignment.Top,
      });
    t.material = n.props.material ?? context.comp.textMaterial;
    if (t.text !== n.props.text) t.text = n.props.text;
  } else {
    /* "mesh" and everything else */
    setPositionLeft(o, n, context.comp.scaling);
  }

  if (n.tag === "mesh" || n.tag === "roundedRectangle") {
    /* To offset the mesh, but avoid offsetting the children,
     * we need to add a child object */
    const child =
      o.findByNameDirect("mesh")[0] ??
      (() => {
        const child = context.comp.engine.scene.addObject(o);
        child.name = "mesh";
        return child;
      })();

    const sw = n.node.getComputedWidth() * context.comp.scaling[0];
    const sh = n.node.getComputedHeight() * context.comp.scaling[1];
    const centerX = 0.5 * sw;
    const centerY = -0.5 * sh;

    const m = child.getComponent("mesh") ?? child.addComponent("mesh", {});
    m.material = n.props.material;

    let mesh = m.mesh;
    if (n.tag === "roundedRectangle") {
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
      const props = m.roundedRectangleProps ?? {};
      const needsUpdate = !propsEqual(props, p);

      if (needsUpdate) {
        if (mesh && !mesh.isDestroyed) mesh.destroy();
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
          }
        );
        m.roundedRectangleProps = p;
      }

      child.setPositionLocal([centerX, centerY, Z_INC]);
      child.resetScaling();
    } else {
      /* Planes are diameter of 2 */
      child.setPositionLocal([centerX, centerY, Z_INC]);
      child.setScalingLocal([0.5 * sw, 0.5 * sh, 1]);
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
  props: YogaNodeProps,
  wrapper?: NodeWrapper,
  ctx?: Context
) {
  if (tag === "text") {
    // FIXME Calculate proper text bounds from font
    const s = props.fontSize ?? DEFAULT_FONT_SIZE;

    let w = 0;
    let h = 0;
    if (wrapper) {
      let t = wrapper.object?.getComponent(TextComponent);
      if (!t) {
        applyLayoutToSceneGraph(wrapper, ctx!, true);
        t = wrapper.object?.getComponent(TextComponent)!;
      }
      const b = t.getBoundingBoxForText(props.text.toString() ?? "", tempVec4);
      w = TEXT_BASE_SIZE * s * (b[2] - b[0]);
      h = TEXT_BASE_SIZE * s * (b[3] - b[1]);
    } else {
      const fakePerCharWidth = 0.7 * s;
      let lines = 1;
      let maxLine = 0;
      let lastLineStart = 0;
      const t = props.text.toString();
      for (let i = 0; i < t.length; ++i) {
        if (t.charAt(i) == "\n") {
          ++lines;
          maxLine = Math.max(maxLine, i - lastLineStart);
          lastLineStart = i + 1;
        }
      }
      maxLine = Math.max(maxLine, t.length - lastLineStart);
      w = fakePerCharWidth * maxLine;
      h = s * lines + (lines - 1) * 15;
    }
    node.setHeight(props.height ?? h);
    node.setWidth(props.width ?? w);
  } else {
    node.setWidth(props.width);
    node.setHeight(props.height);
  }

  if (wrapper?.props.alignContent !== props.alignContent)
    node.setAlignContent(props.alignContent);
  if (wrapper?.props.alignItems !== props.alignItems)
    node.setAlignItems(props.alignItems);
  if (wrapper?.props.alignSelf !== props.alignSelf)
    node.setAlignSelf(props.alignSelf);
  if (wrapper?.props.aspectRatio !== props.aspectRatio)
    node.setAspectRatio(props.aspectRatio);

  if (wrapper?.props.display !== props.display) node.setDisplay(props.display);

  if (wrapper?.props.flex !== props.flex) node.setFlex(props.flex);
  if (wrapper?.props.flexDirection !== props.flexDirection)
    node.setFlexDirection(props.flexDirection);
  if (wrapper?.props.flexBasis !== props.flexBasis)
    node.setFlexBasis(props.flexBasis);
  if (wrapper?.props.flexGrow !== props.flexGrow)
    node.setFlexGrow(props.flexGrow);
  if (wrapper?.props.flexShrink !== props.flexShrink)
    node.setFlexShrink(props.flexShrink);
  if (wrapper?.props.flexWrap !== props.flexWrap)
    node.setFlexWrap(props.flexWrap);

  if (wrapper?.props.isReferenceBaseline !== props.isReferenceBaseline)
    node.setIsReferenceBaseline(props.isReferenceBaseline);

  if (wrapper?.props.gap !== props.gap) node.setGap(Y.Gutter.All, props.gap);
  if (wrapper?.props.rowGap !== props.rowGap)
    node.setGap(Y.Gutter.Row, props.rowGap);
  if (wrapper?.props.columnGap !== props.columnGap)
    node.setGap(Y.Gutter.Column, props.columnGap);

  if (wrapper?.props.justifyContent !== props.justifyContent)
    node.setJustifyContent(props.justifyContent);

  if (wrapper?.props.border !== props.border)
    node.setBorder(Y.Edge.All, props.border);
  if (wrapper?.props.borderTop !== props.borderTop)
    node.setBorder(Y.Edge.Top, props.borderTop);
  if (wrapper?.props.borderBottom !== props.borderBottom)
    node.setBorder(Y.Edge.Bottom, props.borderBottom);
  if (wrapper?.props.borderLeft !== props.borderLeft)
    node.setBorder(Y.Edge.Left, props.borderLeft);
  if (wrapper?.props.borderRight !== props.borderRight)
    node.setBorder(Y.Edge.Right, props.borderRight);

  if (wrapper?.props.margin !== props.margin)
    node.setMargin(Y.Edge.All, props.margin);
  if (wrapper?.props.marginTop !== props.marginTop)
    node.setMargin(Y.Edge.Top, props.marginTop);
  if (wrapper?.props.marginBottom !== props.marginBottom)
    node.setMargin(Y.Edge.Bottom, props.marginBottom);
  if (wrapper?.props.marginLeft !== props.marginLeft)
    node.setMargin(Y.Edge.Left, props.marginLeft);
  if (wrapper?.props.marginRight !== props.marginRight)
    node.setMargin(Y.Edge.Right, props.marginRight);

  if (wrapper?.props.maxHeight !== props.maxHeight)
    node.setMaxHeight(props.maxHeight);
  if (wrapper?.props.maxWidth !== props.maxWidth)
    node.setMaxWidth(props.maxWidth);
  if (wrapper?.props.minHeight !== props.minHeight)
    node.setMinHeight(props.minHeight);
  if (wrapper?.props.minWidth !== props.minWidth)
    node.setMinWidth(props.minWidth);
  if (wrapper?.props.overflow !== props.overflow)
    node.setOverflow(props.overflow);

  if (wrapper?.props.padding !== props.padding)
    node.setPadding(Y.Edge.All, props.padding);
  if (wrapper?.props.paddingTop !== props.paddingTop)
    node.setPadding(Y.Edge.Top, props.paddingTop);
  if (wrapper?.props.paddingBottom !== props.paddingBottom)
    node.setPadding(Y.Edge.Bottom, props.paddingBottom);
  if (wrapper?.props.paddingLeft !== props.paddingLeft)
    node.setPadding(Y.Edge.Left, props.paddingLeft);
  if (wrapper?.props.paddingRight !== props.paddingRight)
    node.setPadding(Y.Edge.Right, props.paddingRight);

  if (wrapper?.props.position !== props.position)
    node.setPositionType(props.position);
  if (wrapper?.props.top !== props.top) node.setPosition(Y.Edge.Top, props.top);
  if (wrapper?.props.bottom !== props.bottom)
    node.setPosition(Y.Edge.Bottom, props.bottom);
  if (wrapper?.props.left !== props.left)
    node.setPosition(Y.Edge.Left, props.left);
  if (wrapper?.props.right !== props.right)
    node.setPosition(Y.Edge.Right, props.right);

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
  any,
  any,
  any,
  any,
  any,
  any
> = {
  //now: Date.now,
  getRootHostContext(context: Context) {
    return context;
  },
  getChildHostContext(parentHostContext: Context) {
    return parentHostContext;
  },
  shouldSetTextContent() {
    return false;
  },
  createTextInstance(
    text: string,
    ctx: Context,
    x: undefined,
    node: ReactNode
  ) {
    debug("createTextInstance", text, ctx, x, node);
  },
  createInstance(tag: string, props: YogaNodeProps, ctx: Context) {
    debug("createInstance", tag, props, ctx);
    const node = Y.default.Node.create(ctx.config);
    const w = { node, tag, props };
    ctx.addNodeWrapper(w);

    applyToYogaNode(tag, node, props, w, ctx);

    return w;
  },
  appendInitialChild(parent: NodeWrapper, child: NodeWrapper) {
    debug("appendInitialChild", child, parent);

    applyToYogaNode(child.tag, child.node, child.props);
    parent.node.insertChild(child.node, parent.node.getChildCount());

    child.parent = parent;
    parent.children!.push(child);

    parent.ctx!.comp.needsUpdate = true;
  },
  appendChild(parent: NodeWrapper, child: NodeWrapper) {
    debug("appendChild", parent, child);

    applyToYogaNode(child.tag, child.node, child.props);
    parent.node.insertChild(child.node, parent.node.getChildCount());

    child.parent = parent;
    parent.children!.push(child);

    parent.ctx!.comp.needsUpdate = true;
  },
  appendChildToContainer(ctx: Context, child: NodeWrapper) {
    debug("appendChildToContainer", ctx, child);
    ctx.root = child;

    ctx.comp.needsUpdate = true;
  },
  insertBefore(parent: NodeWrapper, child: NodeWrapper, before: NodeWrapper) {
    debug('insertBefore', parent, child, before);

    applyToYogaNode(child.tag, child.node, child.props);

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
  removeChild(parent: NodeWrapper, child: NodeWrapper) {
    debug("removeChild", parent, child);
    destroyTreeForNode(child, parent.ctx);

    parent.ctx!.comp.needsUpdate = true;
  },
  removeChildFromContainer(ctx: Context, child: NodeWrapper) {
    debug("removeChildFromContainer", ctx, child);
    destroyTreeForNode(child, ctx);
  },
  finalizeInitialChildren(
    instance: NodeWrapper,
    tag: string,
    props: YogaNodeProps,
    ctx: Context,
    hostContext: Context
  ) {
    debug("finalizeInitialChildren", instance, tag);
    return false;
  },
  prepareForCommit(ctx: Context) {
    debug("prepareForCommit");
    return null;
  },
  resetAfterCommit(containerInfo: Context) {
    debug("resetAfterCommit", containerInfo);
  },
  commitUpdate(
    instance: NodeWrapper,
    updatePayload: null,
    type: string,
    prevProps: YogaNodeProps,
    nextProps: YogaNodeProps,
    internalHandle
  ) {
    debug("commitUpdate");
    instance.props = nextProps;
    instance.dirty = true;
    applyToYogaNode(instance.tag, instance.node, instance.props);

    instance.ctx!.comp.needsUpdate = true;
  },
  shouldCommitUpdate() {
    debug("shouldCommitUpdate");
    return true;
  },
  prepareUpdate(
    instance: NodeWrapper,
    tag: string,
    oldProps: YogaNodeProps,
    newProps: YogaNodeProps,
    rootContainer: Context,
    hostContext: Context
  ) {
    debug("prepareUpdate", oldProps, newProps);
    if (propsEqual(oldProps, newProps)) return null;
    return {};
  },
  getPublicInstance(...args: any[]) {
    debug("getPublicInstance", ...args);
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
  clearContainer(container) {
    debug("clearContainer", container);
  },
  getInstanceFromScope(scopeInstance: any) {},
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

  setContext(c: Context): void;
  updateLayout(): void;
  render(): ReactNode;
};

export enum UISpace {
  World = 0,
  Screen = 1,
}

export abstract class ReactUiBase extends Component implements ReactComp {
  static TypeName = "react-ui-base";

  @property.enum(["world", "screen"])
  space = 0;

  @property.material({ required: true })
  textMaterial!: Material;

  width = 100;
  height = 100;

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
    vec3.transformMat4(topLeft, [-1, 1, -0.75], invProj);
    vec3.transformMat4(bottomRight, [1, -1, -0.75], invProj);

    const s = bottomRight[0] - topLeft[0];
    this.object.setScalingLocal([s, s, s]);
    /* Convert from yoga units to 0-1 */
    this.width = this.engine.canvas.clientWidth;
    this.height = this.engine.canvas.clientHeight;
    this.scaling = [1 / this.width, 1 / this.width];
    this.object.setPositionLocal(topLeft);

    this.needsUpdate = true;
    this.viewportChanged = true;
  };

  scaling = [0.01, 0.01];

  renderer?: WonderlandRenderer;

  ctx: Context | null = null;

  protected _viewComponent?: ViewComponent;

  needsUpdate = true;
  viewportChanged = true;

  setContext(c: Context): void {
    this.ctx = c;
  }

  updateLayout() {
    if (!this.ctx?.root) return;

    debug("updateLayout", this.width, this.height);
    this.ctx.wrappers.forEach((w) => applyToYogaNode(w.tag, w.node, w.props));
    this.ctx.root.node.calculateLayout(
      this.width ?? 100,
      this.height ?? 100,
      Y.Direction.LTR
    );

    applyLayoutToSceneGraph(this.ctx.root, this.ctx!, this.viewportChanged);
    this.needsUpdate = false;
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

  update() {
    if (this.needsUpdate) this.updateLayout();
  }

  callbacks: Record<string, any> = {};

  onActivate(): void {
    if (!this._viewComponent) return;
    const canvas = this.engine.canvas!;

    this.callbacks = {
      click: this.onClick.bind(this),
      pointermove: this.onPointerMove.bind(this),
      pointerdown: this.onPointerDown.bind(this),
      pointerup: this.onPointerUp.bind(this),
    };

    for (const [k, v] of Object.entries(this.callbacks)) {
      canvas.addEventListener(k, v);
    }
  }

  onDeactivate(): void {
    if (!this._viewComponent) return;
    const canvas = this.engine.canvas!;

    for (const [k, v] of Object.entries(this.callbacks)) {
      canvas.removeEventListener(k, v);
    }
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
      callback(node);
      target = node;
    }

    for (let n of node.children!) {
      target =
        this.forEachElementUnderneath(n, x - l, y - t, callback) ?? target;
    }

    return target;
  }

  emitEvent(eventName: string, x: number, y: number, e: Event) {
    if (!this.ctx?.root) return;
    const target = this.forEachElementUnderneath(this.ctx.root, x, y, (w) => {
      const event = w?.props[eventName];
      if (event !== undefined) {
        event({ x, y, e });
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
    if (!e.isPrimary || !this.ctx) return;
    const x = e.clientX;
    const y = e.clientY;

    const cur = (this.curGen = this.curGen ^ 0x1);
    /* Clear hovering flag */
    this.ctx.wrappers.forEach((w) => (w.hovering![cur] = false));
    const target = this.emitEvent("onMove", x, y, e);
    this.updateHoverState(x, y, e, target!);
  }

  updateHoverState(
    x: number,
    y: number,
    e: PointerEvent,
    node?: NodeWrapper | null
  ) {
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
          event({ x, y, e });
          return true;
        }
      }
    });
  }

  /** 'click' event listener */
  onClick(e: MouseEvent) {
    const x = e.clientX;
    const y = e.clientY;
    const t = this.emitEvent("onClick", x, y, e);
    return t;
  }

  /** 'pointerdown' event listener */
  onPointerDown(e: PointerEvent) {
    /* Don't care about secondary pointers or non-left clicks */
    if (!e.isPrimary || e.button !== 0) return;
    const x = e.clientX;
    const y = e.clientY;
    const t = this.emitEvent("onDown", x, y, e);
    return t;
  }

  /** 'pointerup' event listener */
  onPointerUp(e: PointerEvent) {
    /* Don't care about secondary pointers or non-left clicks */
    if (!e.isPrimary || e.button !== 0) return;
    const x = e.clientX;
    const y = e.clientY;
    const t = this.emitEvent("onUp", x, y, e);
    return t;
  }

  renderCallback() {
    // FIXME: Never called
    this.needsUpdate = true;
  }

  abstract render(): ReactNode;
}

export async function initializeRenderer() {
  if (!Y) {
    Y = await import("yoga-layout");
  }
  return {
    render(element: ReactNode, reactComp: ReactComp, callback?: () => void) {
      // element: This is the react element for App component
      // renderDom: This is the host root element to which the rendered app will be attached.
      const container = reconcilerInstance.createContainer(
        new Context(reactComp),
        0,
        null,
        false,
        null,
        "root",
        (e: Error) => console.error(e),
        null
      );
      reactComp.setContext(container.containerInfo);

      const parentComponent = null;
      reconcilerInstance.updateContainer(
        element,
        container,
        parentComponent,
        reactComp.renderCallback.bind(reactComp)
      );
    },
  };
}

export const Container = (props: React.PropsWithChildren<YogaNodeProps>) => {
  return <container {...props}>{props.children}</container>;
};

export const Panel = (
  props: React.PropsWithChildren<
    {
      material: Material;
      rounding?: number;
      resolution?: number;
    } & YogaNodeProps
  >
) => {
  return <roundedRectangle {...props}>{props.children}</roundedRectangle>;
};

export const Plane = (
  props: React.PropsWithChildren<
    {
      mesh: Mesh;
      material: Material;
    } & YogaNodeProps
  >
) => {
  return <mesh {...props}>{props.children}</mesh>;
};

export const Column = (props: React.PropsWithChildren<YogaNodeProps>) => {
  return (
    <Container
      display={Display.Flex}
      flexDirection={FlexDirection.Column}
      {...props}
    >
      {props.children}
    </Container>
  );
};
export const Row = (props: React.PropsWithChildren<YogaNodeProps>) => {
  return (
    <Container
      display={Display.Flex}
      flexDirection={FlexDirection.Row}
      {...props}
    >
      {props.children}
    </Container>
  );
};

export const Text = (
  props: React.PropsWithoutRef<
    YogaNodeProps & {
      text: string;
      fontSize?: number;
    }
  >
) => {
  return <text {...props} />;
};

export const ProgressBar = (
  props: React.PropsWithChildren<
    YogaNodeProps & {
      /* Number between 0-1 */
      value: number;
      rounding?: number;
      fgMaterial: Material;
      bgMaterial: Material;
    }
  >
) => {
  const rounding = props.rounding ?? 30;
  return (
    <roundedRectangle
      material={props.bgMaterial}
      {...props}
      display={Display.Flex}
      flexDirection={FlexDirection.Row}
      padding={6}
      paddingLeft={8}
      paddingRight={8}
      resolution={6}
      rounding={rounding * 1.5}
    >
      <Container
        alignItems={Align.FlexStart}
        position={PositionType.Absolute}
        width="100%"
        height="100%"
        left={12}
      >
        {props.children}
      </Container>
      {props.value > 0.1 && (
        <roundedRectangle
          width={(100 * props.value).toString() + "%"}
          height="100%"
          material={props.fgMaterial}
          alignItems={Align.Center}
          justifyItems={Justify.Center}
          rounding={rounding}
        ></roundedRectangle>
      )}
    </roundedRectangle>
  );
};
