import {
    Collider,
    CollisionComponent,
    Component,
    Material,
    ViewComponent,
    WonderlandEngine,
} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {mat4, vec3} from 'gl-matrix';
import {ReactNode} from 'react';
import type {ReactComp} from './renderer-types.js';

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

export {
    Align,
    Display,
    FlexDirection,
    Justify,
    Overflow,
    PositionType,
    Wrap,
} from 'yoga-layout/load';

import {Direction} from 'yoga-layout/load';

import {Cursor, CursorTarget, EventTypes} from '@wonderlandengine/components';
import {NodeWrapper, Context} from './renderer/core.js';
import {applyLayoutToSceneGraph, applyToYogaNode} from './renderer/layout.js';
const DEBUG_RENDERER = false;
const DEBUG_EVENTS = false;
const debug = DEBUG_RENDERER ? console.log : () => {};

import {reconcilerInstance, initializeRenderer} from './renderer/reconciler-host.js';

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
