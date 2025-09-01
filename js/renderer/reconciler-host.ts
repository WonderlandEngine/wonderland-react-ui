import Reconciler, {Fiber, HostConfig as HostConfigType} from 'react-reconciler';
import type {Yoga, Config, Node as YogaNode} from 'yoga-layout/load';
import {MeasureMode, loadYoga} from 'yoga-layout/load';
import type {ReactNode} from 'react';
import type {
    YogaNodeProps,
    TextProps,
    RoundedRectangleProps,
    MeshProps,
    NineSliceProps,
    ReactComp,
} from '../renderer-types.js';
import {Object3D, TextComponent, TextWrapMode, Font, Material} from '@wonderlandengine/api';
import {applyToYogaNode} from './layout.js';
import {destroyTreeForNode, NodeWrapper, Context, currentYoga, setYoga} from './core.js';
import {propsEqual} from './props-helpers.js';
import {TEXT_BASE_SIZE} from './text-helpers.js';

const DEBUG_RENDERER = false;
const DEBUG_EVENTS = false;
const debug = DEBUG_RENDERER ? console.log : () => {};
const DEFAULT_FONT_SIZE = 50;

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
        const node = currentYoga!.Node.create(ctx.config);
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

                        let calulatedWidth = 0;
                        if (widthMode === MeasureMode.Undefined) {
                            calulatedWidth = bbWidth;
                        } else if (widthMode === MeasureMode.Exactly) {
                            calulatedWidth = width;
                        } else if (widthMode === MeasureMode.AtMost) {
                            calulatedWidth = Math.min(bbWidth, width);
                        }

                        let calulatedHeight = 0;
                        if (heightMode === MeasureMode.Undefined) {
                            calulatedHeight = bbHeight;
                        } else if (heightMode === MeasureMode.Exactly) {
                            calulatedHeight = height;
                        } else if (heightMode === MeasureMode.AtMost) {
                            calulatedHeight = Math.min(bbHeight, height);
                        }

                        node.setHeight(calulatedHeight);
                        node.setWidth(calulatedWidth);
                        return {width: calulatedWidth, height: calulatedHeight};
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
        if (beforeIndex !== -1) {
            parent.node.insertChild(child.node, beforeIndex);
            parent.children.splice(beforeIndex, 0, child);
        } else {
            parent.node.insertChild(child.node, parent.node.getChildCount());
            parent.children.push(child);
        }

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

// Exported for unit tests to reproduce container insertion behavior
export function __test_insertInContainerBefore(
    container: any,
    child: any,
    beforeChild: any
) {
    return (HostConfig as any).insertInContainerBefore(container, child, beforeChild);
}

export const reconcilerInstance = Reconciler(HostConfig);

let yogaInitializationPromise: Promise<void> | null = null;

export async function initializeRenderer() {
    if (!currentYoga) {
        if (!yogaInitializationPromise) {
            yogaInitializationPromise = loadYoga().then((loadedYoga) => {
                // set the shared yoga instance
                setYoga(loadedYoga as unknown as Yoga);
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
            const result = reconcilerInstance.injectIntoDevTools({
                bundleType: 0,
                version: '0.2.1',
                rendererPackageName: 'wonderlandengine/react-ui',
                findFiberByHostInstance(instance: NodeWrapper | void): Fiber | null {
                    console.log(instance ?? 'no instance');
                    return null;
                },
            });
            console.log('Devtools:', result);
        },
    };
}
