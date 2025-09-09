import Reconciler, {Fiber, HostConfig as HostConfigType} from 'react-reconciler';
import {MeasureMode} from 'yoga-layout/load';
import type {ReactNode} from 'react';
import type {YogaNodeProps, ReactComp} from '../renderer-types.js';
import {Object3D, TextComponent, TextWrapMode, Font} from '@wonderlandengine/api';
import {applyToYogaNode} from './layout.js';
import {destroyTreeForNode, NodeWrapper, Context, yoga, ensureYogaLoaded} from './core.js';
import {propsEqual} from '../helpers/props-helpers.js';
import {version as reactVersion} from 'react';
import {debug, DEFAULT_FONT_SIZE, TEXT_BASE_SIZE} from '../constants.js';

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
 * Renderer implementation that wraps react-reconciler to mount React trees
 * into Wonderland Engine via the custom HostConfig.
 */
class RendererImpl implements Renderer {
    rootContainer: Reconciler.OpaqueRoot | undefined;

    /**
     * Unmount the current root container if one exists.
     *
     * This triggers a full unmount by updating the container with null.
     */
    unmountRoot() {
        if (this.rootContainer) {
            reconcilerInstance.updateContainer(null, this.rootContainer);
        }
    }

    /**
     * Create a new reconciler container and render the provided React element
     * into the Wonderland Engine context represented by reactComp.
     *
     * @param element - The React element or component tree to mount.
     * @param reactComp - The ReactComp instance providing engine and component context.
     * @param callback - Optional callback executed after the initial render is complete.
     */
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
        const result = reconcilerInstance.injectIntoDevTools({
            bundleType:
                typeof (globalThis as any).process !== 'undefined' &&
                (globalThis as any).process.env &&
                (globalThis as any).process.env.NODE_ENV !== 'production'
                    ? 1
                    : 0,
            version: reactVersion,
            rendererPackageName: '@wonderlandengine/react-ui',
            findFiberByHostInstance(instance: NodeWrapper | void): Fiber | null {
                console.log(instance ?? 'no instance');
                return null;
            },
        });
        debug('DevTools injection:', result);
    }
}

/**
 * Initialize and return a Renderer instance.
 *
 * This function ensures the Yoga layout library is loaded before constructing
 * the renderer.
 *
 * @returns A Promise that resolves to a Renderer instance.
 */
export async function initializeRenderer(): Promise<Renderer> {
    // Ensure yoga is loaded, or wait until loaded
    await ensureYogaLoaded();
    return new RendererImpl();
}
