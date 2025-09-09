import type {Yoga, Config, Node as YogaNode} from 'yoga-layout/load';
import {loadYoga} from 'yoga-layout/load';

/**
 * Core helpers shared by the renderer.
 *
 * This module intentionally keeps a very small public surface: a shared
 * Yoga instance reference and a few light-weight helpers and containers used
 * by the renderer implementation. Keeping this file minimal avoids circular
 * imports between renderer modules while still providing a single place for
 * commonly-used primitives.
 */

/** The globally-shared Yoga API instance used to create and configure layouts.
 *
 * This is assigned via {@link setYoga} by the loader/initializer before any
 * Contexts are constructed. It is nullable to allow lazy initialization.
 */
export let yoga: Yoga | null = null;

/** Set the shared Yoga instance if one is not already present.
 *
 * This helper intentionally only sets the instance once. Callers that need to
 * replace the Yoga instance must do so through other means (not supported by
 * this minimal core) to avoid surprising consumers that already rely on the
 * previously-created Config/Nodes.
 *
 * @param yogaNew - The Yoga instance to use for new Contexts and Nodes.
 */
export function setYoga(yogaNew: Yoga) {
    // only set if not already set
    if (!yoga) {
        yoga = yogaNew;
    }
}

// Centralized lazy loader for Yoga. This mirrors the previous local
// initialization logic but keeps it in a single place so other modules
// don't need to import and call `loadYoga()` themselves.
let yogaInitializationPromise: Promise<Yoga> | null = null;

/**
 * Ensure the shared Yoga instance is loaded and set on `yoga`.
 * Multiple concurrent callers will share the same in-flight promise.
 */
export async function ensureYogaLoaded(): Promise<Yoga> {
    if (yoga) return yoga;
    if (!yogaInitializationPromise) {
        yogaInitializationPromise = loadYoga().then((loadedYoga) => {
            setYoga(loadedYoga as unknown as Yoga);
            return yoga as Yoga;
        });
    }
    return yogaInitializationPromise;
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
    constructor(c: any) {
        this.root = null;
        this.comp = c;

        // The shared Yoga instance is set by the loader/initializer.
        // We assume it exists when a Context is constructed via initializeRenderer.
        this.config = yoga!.Config.create();
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
}
