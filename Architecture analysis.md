# Architecture analysis

## High-level architecture

Data/control flow (conceptual):

```
React JSX tree
   ↓ (react-reconciler with custom HostConfig in `js/renderer/reconciler-host.ts`)
NodeWrapper tree (logical layout tree; each wraps a Yoga node)
   ↓ (prop → Yoga mutation via `applyToYogaNode`)
Yoga layout calculation (`calculateLayout`)
   ↓ (post-pass `applyLayoutToSceneGraph` in `js/renderer/layout.ts`)
Wonderland scene graph objects (meshes, text components, transforms)
   ↓
Pointer / cursor events mapped back to React-style callbacks (in `ReactUiBase`)
```

Key modules:

- renderer.ts: Base Wonderland component (`ReactUiBase`) hosting the React root, lifecycle integration, event dispatch, screen/world mode, sizing/scaling.
- reconciler-host.ts: Custom React HostConfig translating reconciliation operations into Yoga/NodeWrapper mutations and marking the root dirty.
- core.ts: `NodeWrapper` (layout + runtime metadata) and `Context` (registry + Yoga config + root).
- layout.ts: Two directions: (1) map props to Yoga (`applyToYogaNode`), (2) map computed Yoga layout to scene graph (`applyLayoutToSceneGraph`) including mesh/text updates.
- Various helper modules (`text-helpers`, `mesh-helpers`, `position-helpers`, etc.) encapsulate specialized transforms / geometry building.
- Event system: Pointer/cursor events bubble through a manual hit-test traversing the Yoga-computed rectangles.

## Strengths

- Clear layering: reconciliation → layout → scene application.
- Yoga + React reconciliation is cleanly separated from scene-object instantiation.
- Tests exist for core pieces (e.g. tree destruction).
- `Context` keeps ownership + cleanup in one place.
- Hover state uses a double-buffer bitset approach to derive enter/leave without storing previous coordinates.

## Potential Issues & Recommendations

Below is a structured list (ID, area, severity, summary, proposed direction).

### Correctness / Bugs

1. C-01: ~~Scaling array uses width for both axes
   In `ReactUiBase._onViewportResize`: `this.scaling = [1 / this.width, 1 / this.width];` Likely second element should be `1 / this.height`.
   Fix: `this.scaling = [1 / this.width, 1 / this.height];` and audit any assumptions elsewhere.~~
    _TK => Scaling is based on how Wonderland does the scaling where the width is leading._

2. C-02: Collider extents not updated after layout changes (World space)
   Box collider is sized only in `onActivate`. Any runtime layout or size change won’t adjust collision extents, breaking hit tests.
   Fix: Recompute collider size when `needsUpdate` resolves (after `updateLayout`) or subscribe to a layout-done hook.

3. C-03: Missing removal of resize listener
   `_onViewportResize` is added (`engine.onResize.add`) in `start` for Screen space but never removed in `onDeactivate`/`onDestroy`, causing leak if component cycles or multiple instances mount/unmount.
   Fix: Track the bound callback and remove it in `onDestroy`.

4. C-04: Potential stale `dpr` logic & double scaling
   You set `width = _dpiAdjust(canvas.clientWidth)` where `_dpiAdjust` multiplies by `pixelSizeAdjustment * dpr`. If pixelSizeAdjustment ≠ 1 you end up embedding scaling into the logical width, then also use `scaling = [1/width, …]`. This may distort absolute pixel mapping (hard to reason about).
   Fix: Separate “device pixels” vs “layout units”: keep raw canvas size, store scaling factors separately.

5. C-05: `applyToYogaNode` assigns `wrapper.props = props` (reference)
   After this, subsequent comparisons rely on the new reference having different property values than itself—works only because comparisons are made before assignment in that call, but mutating `props` elsewhere (accidentally) would break diff logic.
   Fix: Either deep/ shallow clone into an internal object or assign after cloning: `wrapper.props = {...props}`.

6. C-06: Percent / 'auto' values may be passed directly to Yoga setters
   Types allow `ValueType = number | 'auto' | '${number}%'`, but `applyToYogaNode` calls `node.setWidth(props.width)` etc. Yoga expects numbers or UNDEFINED flags; passing strings may silently fail or coerce wrong.
   Fix: Normalize values: parse `%` into `Yoga.UNDEFINED` + set percent via dedicated API (if available) or compute absolute during layout constraints.

7. C-07: Event hit test recursion coordinate translation bug risk
   `forEachElementUnderneath` subtracts parent `l` / `t` from x/y as recursion goes down, but uses children’s absolute computedLeft/Top again (which are already relative to parent in Yoga). That’s correct if Yoga returns relative values; if they are absolute (some Yoga builds can return absolute depending on config) this would mis-hit.
   Verify assumption; if absolute, remove coordinate subtraction.

8. C-08: Hover ancestor marking order could skip root transitions
   Ancestor chain marking happens after the target search; if a parent previously hovered but no longer contains pointer (because target changed to a sibling) you rely on double-buffer diff; works, but if node removal occurs mid-frame you may miss an `onUnhover`.
   Fix: On node removal, proactively fire `onUnhover` for any node whose `hovering[lastGen]` was true.

9. C-09: `renderCallback` “FIXME: Never called”
   Indicating expected integration point not wired up. If external code relies on it, layouts could become stale.
   Fix: Use React reconciler HostConfig `resetAfterCommit` or `commitUpdate` to call `comp.renderCallback()` (or rename to reflect actual semantics).

10. C-10: No null-safety around `this.engine.canvas` (could be undefined in some headless/test contexts).
    Fix: Guard or throw descriptive error.

11. C-11: `getCursorPosition` assumes world-space transform stable; if parent transforms animate between pointer events, hit detection might drift compared to collider size (collider sized once).
    Fix: Keep collider sync (see C-02) or compute extents lazily each pointer event (cache for frame).

12. C-12: Z ordering prone to z-fighting
    Constant `Z_INC = 0.001` for every sibling + optional `z` prop can accumulate precision issues in large hierarchies.
    Fix: Consider layering via render queue, or stable integer layer that maps to depth via a scaling factor computed per frame (normalize range).

13. C-13: Potential mismatch of width vs height scaling for pointer coordinate transform
    When converting cursor position, divides by `this.scaling[0]` and `this.scaling[1]`; if bug in scaling (C-01) remains, y coordinates are incorrect.

14. C-14: Unsubscribing only by string IDs on `CursorTarget` events—if another system uses same IDs there’s a clash risk.
    Fix: Namespace IDs or retain direct callback references and remove by reference.

### Performance

15. P-01: Full-tree layout application on any prop change
    `needsUpdate` triggers `updateLayout` which re-applies props to _all_ wrappers before calling `calculateLayout`. For large trees, this scales O(N) even for localized changes.
    Fix: Track dirty set of wrappers changed via reconciliation; only reapply those before layout. Optionally skip if no Yoga-affecting props changed.

16. P-02: Per-pointer-move full tree traversal for hit testing
    `forEachElementUnderneath` always descends entire tree.
    Fix: Maintain spatial index (quadtree / bounding interval hierarchy) or early prune nodes using bounding boxes before recursion; also allow bail-out once deepest match found (if strict topmost semantics).

17. P-03: Redundant layout application in `applyToYogaNode` (calls `applyLayoutToSceneGraph` with `force` sometimes) and again after `calculateLayout`. This may cause double scene updates per commit.
    Fix: Restrict runtime object creation to one phase: (a) ensure objects exist (no transforms yet) before layout; (b) after Yoga compute, apply final transforms & sizing.

18. P-04: Frequent allocations in `_onViewportResize` (`new Float32Array(16)` each call)
    Fix: Reuse a cached matrix buffer.

19. P-05: Mesh/text updates may rebuild meshes unnecessarily when props unchanged (depends on helpers).
    Fix: Ensure `propsEqual` covers all expensive rebuild triggers; add guards or incremental diff.

### Memory / Resource Management

20. M-01: Yoga nodes freed, but materials / meshes / textures cloned or created inside mesh/text helpers might not be disposed when nodes removed (depends on WLE resource lifecycle).
    Fix: Add explicit disposal hooks in `destroyTreeForNode` for created runtime resources (e.g., custom meshes, GPU buffers) if not auto-GCed.

21. M-02: `engine.onResize.add` leak (see C-03).
22. M-03: Potential retention of large `props` objects (some might contain textures/materials) since `wrapper.props = props` keeps original reference.
    Fix: Store only shallow primitives + lightweight IDs; keep heavy objects in managed caches.

### Maintainability / Extensibility

23. MA-01: Monolithic `applyToYogaNode` (~large, linear property diff) hard to extend (risk of omission or ordering bugs).
    Fix: Break into small mappers grouped by concern (flex, spacing, borders, position, text overrides), and iterate over a descriptor array.

24. MA-02: Mixed concerns in `ReactUiBase` (lifecycle, screen/world sizing, event dispatch, layout invalidation).
    Fix: Extract:
    - SizingStrategy (world vs screen)
    - PointerEventDispatcher
    - LayoutController (manages dirty flags + scheduling)
    Each composed into `ReactUiBase` for clarity/testing.

25. MA-03: Absence of TypeScript typings for NodeWrapper props (`any` usage).
    Fix: Define a union or generic <P extends YogaNodeProps> and narrow per tag.

26. MA-04: Lack of explicit contract for "when is layout valid"—consumers might query positions mid-frame.
    Fix: Provide a public hook/event: `onLayoutCommit()`.

27. MA-05: The tree debug facility (`printTree`) logs raw props (could be verbose / leak references).
    Fix: Format selective properties or include an optional filter.

28. MA-06: Hard-coded reliance on `activeViews[0]`.
    Fix: Allow specifying target `ViewComponent` via property; fallback to first.

29. MA-07: Config of Reconciler is not testable.
    Fix: Separate all functions into actual separate functions in a separate file. Export per function.

### API Ergonomics / DX

30. DX-01: Missing guidance for world vs screen differences (pixel scaling semantics, `scalingMode`).
    Fix: Expand README/API docs clarifying coordinate spaces and how `width/height/manualHeight` interact.

31. DX-02: `z` semantic is unclear (relative inside parent? absolute layering?).
    Fix: Document layering model; maybe rename to `zOffset` or `layerOffset`.

32. DX-03: Event objects are minimal; no `target` wrapper reference is passed, forcing re-hit if needed.
    Fix: Pass the `NodeWrapper` or a stable `id` to handlers.

33. DX-04: No batching/coalescing strategy for multiple prop changes before layout; user might manually throttle.
    Fix: Add `requestLayout()` + microtask debounce.

### Testing Gaps

34. T-01: No tests for pointer event dispatch / hover transitions.
35. T-02: No tests for scaling modes (`Absolute`, `FixedHeight`, `FixedHeightLimitedWidth`).
36. T-03: No tests ensuring `destroyTreeForNode` releases meshes/text properly (resource cleanup).
37. T-04: No test validating percent/auto dimension parsing (if implemented).
38. T-05: No test covering multi-root or reparent operations (insertBefore ordering with overlapping nodes).

### Observability

39. O-01: No instrumentation for layout duration or frame cost.
    Fix: Wrap `calculateLayout` + `applyLayoutToSceneGraph` in optional timing metrics (e.g., performance.now()).

40. O-02: No devtools bridge or host config warnings when unsupported prop encountered.
    Fix: Introduce a development-mode validator for props at `prepareUpdate`.

### Security / Robustness

41. R-01: Lack of defensive guards if React tries to render primitive / unsupported tag (HostConfig should throw early).
42. R-02: Pointer event handling for world space trusts `c.cursorPos`; missing null/undefined guard.

## Prioritized “Top 8” Immediate Fixes

1. ~~C-01 scaling bug (likely user-visible error).~~
2. C-02 collider not updating after layout changes (interaction correctness).
3. C-03 resize listener leak.
4. C-05 unsafe `props` reference reuse (diff integrity).
5. P-01 full-tree reapply cost (scalability bottleneck).
6. C-06 width/height value normalization (hidden correctness issue).
7. C-09 unused `renderCallback` (dead API / confusion).
8. P-02 hit test traversal inefficiency (input latency for large trees).

## Suggested Refactor Path (Incremental)

Phase 1 (Bug fixes / low risk):

- Fix scaling assignment, add resize unsubscribe, update collider on layout commit.
- Clone `props` in `applyToYogaNode`.
- Normalize dimension values before Yoga calls.
- Wire `renderCallback` via `resetAfterCommit`.

Phase 2 (Performance):

- Track dirty wrappers (set on `prepareUpdate`) and only reapply them.
- Defer `applyLayoutToSceneGraph` to one post-layout pass.
- Add early exit & pruning in hit testing.

Phase 3 (API & Maintainability):

- Extract dispatcher / sizing strategies.
- Modularize property mappers.
- Add documented public events (`onLayoutCommit`, `onBeforeLayout`).

Phase 4 (Testing & Tooling):

- Add unit tests for events, scaling modes, layering.
- Add performance benchmarks (large tree synthetic).
- Add debug overlays (optional bounding boxes).

## Concrete Examples (Selected)

Fix scaling bug:

```ts
// inside _onViewportResize
this.scaling = [1 / this.width, 1 / this.height]; // instead of [1 / this.width, 1 / this.width]
```

Unsubscribe resize:

```ts
async start() {
  if (this.space == UISpace.Screen) {
    ...
    this.engine.onResize.add(this._onViewportResize);
  }
  ...
}

override onDestroy(): void {
  if (this.space == UISpace.Screen) {
    this.engine.onResize.remove(this._onViewportResize);
  }
  this.renderer?.unmountRoot();
}
```

Clone props in mapper:

```ts
if (wrapper) wrapper.props = {...props};
```

Call renderCallback after commit:

```ts
resetAfterCommit(containerInfo: Context) {
  containerInfo.comp.renderCallback?.();
}
```

Collider refresh after layout:

```ts
updateLayout() {
  ...
  applyLayoutToSceneGraph(this.ctx.root, this.ctx!, this.viewportChanged);
  if (this.space == UISpace.World) this._updateCollider();
  ...
}

private _updateCollider() {
  const colliderObject = this.object.findByNameDirect('UIColliderObject')[0];
  if (!colliderObject) return;
  const collision = colliderObject.getComponent(CollisionComponent);
  if (!collision) return;
  const extents = this.object.getScalingWorld(new Float32Array(3));
  extents[0] *= 0.5 * this.width * this.scaling[0];
  extents[1] *= 0.5 * this.height * this.scaling[1];
  extents[2] = 0.05;
  collision.extents.set(extents);
}
```

## Open Questions (If Clarified Could Refine Recommendations)

- Are percent dimensions currently needed, or can they be deferred? (Affects normalization complexity.)
- Expected maximum node count? (Determines urgency of P-01/P-02.)
- Should world-space UI support dynamic DPI scaling hot-switching?
- Is multi-view (VR dual views) a near-term target?

## Summary

The core architectural pattern is solid (React → Yoga → Scene Graph), but a handful of correctness issues (notably scaling, collider staleness) and performance opportunities (full-tree invalidations, unoptimized hit testing) stand out. Addressing the top eight issues will improve reliability and pave the way for scaling to larger UI trees. Subsequent refactors can modularize concerns and enhance developer ergonomics.
