import {
  Alignment,
  Component,
  Material,
  Object3D,
  VerticalAlignment,
  ViewComponent,
} from "@wonderlandengine/api";
import { property } from "@wonderlandengine/api/decorators.js";
import { mat4, vec3 } from "gl-matrix";
import { ReactNode } from "react";
import Reconciler, { HostConfig } from "react-reconciler";
import type Yoga from "yoga-layout";

import type {
  Overflow,
  PositionType,
  Wrap,
} from "yoga-layout/src/generated/YGEnums.js";
import { roundedRectangle } from "./rounded-rectangle-mesh.js";

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

let Y: typeof Yoga | null = null;
type YogaNode = typeof Yoga.Node;
type YogaConfig = typeof Yoga.Config;

type ValueType = number | "auto" | `${number}%`;
type ValueTypeNoAuto = number | "auto" | `${number}%`;

const Z_INC = 0.0001;

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

  onClick: (e: { x: number; y: number; e: React.MouseEvent }) => void;
  onUp: (e: { x: number; y: number; e: React.PointerEvent }) => void;
  onDown: (e: { x: number; y: number; e: React.PointerEvent }) => void;
  onMove: (e: { x: number; y: number; e: React.PointerEvent }) => void;
  hover: (e: { x: number; y: number; e: React.PointerEvent }) => void;
  unHover: (e: { x: number; y: number; e: React.PointerEvent }) => void;
}

function propsEqual(oldProps: YogaNodeProps, newProps: YogaNodeProps) {
  const oldKeys = Object.keys(oldProps);
  const newKeys = Object.keys(newProps);
  if (oldKeys.length !== newKeys.length) return false;

  for (const k of oldKeys) {
    if (
      oldProps[k as any as keyof YogaNodeProps] !=
      newProps[k as any as keyof YogaNodeProps]
    )
      return false;
  }
  return true;
}

class Context {
  root: YogaNode | null;
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
}

function setPositionCenter(o: Object3D, n: YogaNode, s: number[]) {
  o.setPositionLocal([
    (n.node.getComputedLeft() + 0.5 * n.node.getComputedWidth()) * s[0],
    -(n.node.getComputedTop() + 0.5 * n.node.getComputedHeight()) * s[1],
    Z_INC,
  ]);
}

function setPositionLeft(o: Object3D, n: YogaNode, s: number) {
  o.setPositionLocal([
    n.node.getComputedLeft() * s[0],
    -n.node.getComputedTop() * s[1],
    Z_INC,
  ]);
}

function setPositionRight(o: Object3D, n: YogaNode, s: number) {
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
}

function applyLayout(n: NodeWrapper, context: Context) {
  const o =
    n.object ??
    (() => {
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

    const s = 14 * (n.props.fontSize ?? 50) * context.comp.scaling[1];
    o.setScalingLocal([s, s, s]);

    const t =
      o.getComponent("text") ??
      o.addComponent("text", {
        alignment,
        verticalAlignment: VerticalAlignment.Top,
      });
    t.material = n.props.material ?? context.comp.textMaterial;
    t.text = n.props.text;
  } else {
    /* "mesh" and everything else */
    setPositionLeft(o, n, context.comp.scaling);
  }

  if (n.tag === "mesh" || n.tag === "rounded-rectangle") {
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
    child.setPositionLocal([centerX, centerY, Z_INC]);

    const m = child.getComponent("mesh") ?? child.addComponent("mesh", {});
    m.material = n.props.material;

    let mesh = m.mesh;
    if (n.tag === "rounded-rectangle") {
      if (mesh) mesh.destroy();
      mesh = roundedRectangle(
        n.props.engine,
        sw,
        sh,
        (n.props.rounding ?? 30) * context.comp.scaling[0],
        n.props.resolution ?? 4
      );
    }
    m.mesh = n.props.mesh ?? mesh;
  }
}

function updateInstance(tag: string, node: YogaNode, props: YogaNodeProps) {
  if (tag == "row") {
    node.setDisplay(Y.Display.Flex);
    node.setFlexDirection(Y.FlexDirection.Row);
  } else if (tag == "column") {
    node.setDisplay(Y.Display.Flex);
    node.setFlexDirection(Y.FlexDirection.Column);
  }

  if (tag === "text") {
    // FIXME Calculate proper text bounds from font
    const s = props.fontSize ?? 50;
    node.setHeight(props.height ?? s);
    const fakePerCharWidth = 0.7 * s;
    node.setWidth(props.width ?? fakePerCharWidth * (props.text ?? "").length);
  } else {
    node.setWidth(props.width);
    node.setHeight(props.height);
  }

  node.setAlignContent(props.alignContent);
  node.setAlignItems(props.alignItems);
  node.setAlignSelf(props.alignSelf);
  node.setAspectRatio(props.aspectRatio);

  node.setDisplay(props.display);

  node.setFlex(props.flex);
  node.setFlexBasis(props.flexBasis);
  node.setFlexGrow(props.flexGrow);
  node.setFlexShrink(props.flexShrink);
  node.setFlexWrap(props.flexWrap);

  node.setIsReferenceBaseline(props.isReferenceBaseline);

  node.setGap(Y.Gutter.All, props.gap);
  node.setGap(Y.Gutter.Row, props.rowGap);
  node.setGap(Y.Gutter.Column, props.columnGap);

  node.setJustifyContent(props.justifyContent);

  node.setBorder(Y.Edge.All, props.border);
  node.setBorder(Y.Edge.Top, props.borderTop);
  node.setBorder(Y.Edge.Bottom, props.borderBottom);
  node.setBorder(Y.Edge.Left, props.borderLeft);
  node.setBorder(Y.Edge.Right, props.borderRight);

  node.setMargin(Y.Edge.All, props.margin);
  node.setMargin(Y.Edge.Top, props.marginTop);
  node.setMargin(Y.Edge.Bottom, props.marginBottom);
  node.setMargin(Y.Edge.Left, props.marginLeft);
  node.setMargin(Y.Edge.Right, props.marginRight);

  node.setMaxHeight(props.maxHeight);
  node.setMaxWidth(props.maxWidth);
  node.setMinHeight(props.minHeight);
  node.setMinWidth(props.minWidth);
  node.setOverflow(props.overflow);

  node.setPadding(Y.Edge.All, props.padding);
  node.setPadding(Y.Edge.Top, props.paddingTop);
  node.setPadding(Y.Edge.Bottom, props.paddingBottom);
  node.setPadding(Y.Edge.Left, props.paddingLeft);
  node.setPadding(Y.Edge.Right, props.paddingRight);

  node.setPositionType(props.position);
  node.setPosition(Y.Edge.Top, props.top);
  node.setPosition(Y.Edge.Bottom, props.bottom);
  node.setPosition(Y.Edge.Left, props.left);
  node.setPosition(Y.Edge.Right, props.right);
}

const DEBUG_RENDERER = false;
const debug = DEBUG_RENDERER ? console.log : () => {};

const HostConfig: HostConfig<
  string,
  YogaNodeProps,
  Context,
  NodeWrapper,
  any,
  any,
  any,
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

    updateInstance(tag, node, props);

    const w = { node, tag, props };
    ctx.addNodeWrapper(w);
    return w;
  },
  appendInitialChild(parent: NodeWrapper, child: NodeWrapper) {
    debug("appendInitialChild", child, parent);
    if (child) {
      parent.node.insertChild(child.node, parent.node.getChildCount());
      child.parent = parent;
      parent.children!.push(child);
    }
  },
  removeChild(parent: NodeWrapper, child: NodeWrapper) {
    debug("removeChild", parent, child);
    if (child) {
      parent.node.removeChild(child.node);
      child.node.free();
      child.parent = null;
      parent.children!.splice(parent.children?.indexOf(child)!, 1);
      if (child.object) child.object.destroy();

      child.ctx?.removeNodeWrapper(child);
    }
  },
  appendChild(parent: NodeWrapper, child: NodeWrapper) {
    debug("appendChild", parent, child);
    if (child) {
      parent.node.insertChild(child.node, parent.node.getChildCount());
      parent.children!.push(child);
      child.parent = parent;
      if (child.object) child.object.active = true;

      parent.ctx?.comp.updateLayout();
      applyLayout(parent, parent.ctx!);
    }
  },
  appendChildToContainer(ctx: Context, child: NodeWrapper) {
    debug("appendChildToContainer", ctx, child);
    ctx.root = child;
  },
  removeChildFromContainer(ctx: Context, child: NodeWrapper) {
    debug("removeChildFromContainer", ctx, child);
    ctx.root = child;
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
    updateInstance(instance.tag, instance.node, instance.props);
    applyLayout(instance, instance.ctx!);
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
    vec3.transformMat4(topLeft, [-1, 1, -0.9], invProj);
    vec3.transformMat4(bottomRight, [1, -1, -0.9], invProj);

    const s = bottomRight[0] - topLeft[0];
    this.object.setScalingLocal([s, s, s]);
    /* Convert from yoga units to 0-1 */
    this.width = this.engine.canvas.clientWidth;
    this.height = this.engine.canvas.clientHeight;
    this.scaling = [1 / this.width, 1 / this.width];
    this.object.setPositionLocal(topLeft);

    if (this.ctx?.root) this.updateLayout();
  };

  scaling = [0.01, 0.01];

  renderer?: WonderlandRenderer;

  ctx: Context | null = null;

  protected _viewComponent?: ViewComponent;

  setContext(c: Context): void {
    this.ctx = c;
  }

  updateLayout() {
    if (!this.ctx?.root) return;

    debug("updateLayout", this.width, this.height);
    this.ctx.root.node.calculateLayout(
      this.width ?? 100,
      this.height ?? 100,
      /* FIXME: It seems this should be LTR, but then we get a right-to-left layout.
       * Something must be off, but it works this way for now. */
      Y.Direction.RTL
    );

    this.ctx.wrappers.reverse();
    this.ctx.wrappers.forEach((w) => applyLayout(w, this.ctx!));
    this.ctx.wrappers.reverse();
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

  onActivate(): void {
    if (!this._viewComponent) return;
    const canvas = this.engine.canvas!;

    canvas.addEventListener("click", this.onClick);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
  }

  onDeactivate(): void {
    if (!this._viewComponent) return;
    const canvas = this.engine.canvas!;

    canvas.removeEventListener("click", this.onClick);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointerup", this.onPointerUp);
  }

  forEachElementUnderneath(
    node: NodeWrapper | null,
    x: number,
    y: number,
    callback: (node: NodeWrapper) => boolean
  ): NodeWrapper | null {
    if (node === null) return null;

    const pl = node.node.getComputedLeft();
    const pt = node.node.getComputedTop();
    for (let n of node.children!) {
      const yn = n.node;
      const t = yn.getComputedTop();
      const l = yn.getComputedLeft();
      const w = yn.getComputedWidth();
      const h = yn.getComputedHeight();

      if (x > l + w || x < l) continue;
      if (y > t + h || y < t) continue;

      if (callback(n)) return n;

      return this.forEachElementUnderneath(n, x - pl, y - pt, callback);
    }

    return node;
  }

  emitEvent(eventName: string, x: number, y: number, e: Event) {
    if (!this.ctx?.root) return;
    this.forEachElementUnderneath(this.ctx.root, x, y, (w) => {
      w.hovering![this.curGen] = true;
      if (w?.props[eventName] !== undefined) {
        w.props[eventName]({ x, y, e });
        return true;
      }
      return false;
    });
  }

  /** 'pointermove' event listener */
  curGen = 0;
  onPointerMove = (e: PointerEvent) => {
    /* Don't care about secondary pointers */
    if (!e.isPrimary || !this.ctx) return;
    const x = e.clientX;
    const y = e.clientY;

    const cur = this.curGen ^ 1;
    /* Clear hovering flag */
    this.ctx.wrappers.forEach((w) => (w.hovering![cur] = false));
    this.curGen = cur;
    this.emitEvent("onMove", x, y, e);

    const other = this.curGen ^ 0x1;
    this.ctx.wrappers.forEach((w) => {
      const hovering = w.hovering![cur];
      if (hovering != w.hovering![other]) {
        const eventName = hovering ? "onHover" : "onUnhover";
        if (w?.props[eventName] !== undefined) {
          w.props[eventName]({ x: 0, y: 0, e });
          return true;
        }
      }
    });
  };

  /** 'click' event listener */
  onClick = (e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    this.emitEvent("onClick", x, y, e);
  };

  /** 'pointerdown' event listener */
  onPointerDown = (e: PointerEvent) => {
    /* Don't care about secondary pointers or non-left clicks */
    if (!e.isPrimary || e.button !== 0) return;
    const x = e.clientX;
    const y = e.clientY;
    this.emitEvent("onDown", x, y, e);
  };

  /** 'pointerup' event listener */
  onPointerUp = (e: PointerEvent) => {
    /* Don't care about secondary pointers or non-left clicks */
    if (!e.isPrimary || e.button !== 0) return;
    const x = e.clientX;
    const y = e.clientY;
    this.emitEvent("onUp", x, y, e);
  };
  renderCallback = () => {
    this.updateLayout();
  };

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
        callback ?? reactComp.renderCallback
      );
    },
  };
}
