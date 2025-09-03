# Copilot instructions for wonderland-react-ui

This file gives compact, actionable guidance to help an AI code agent become productive in this repository.

1. Big picture (what this repo is and why)

-   Purpose: a React custom renderer that draws UI into the Wonderland Engine runtime (not the DOM).
-   Key idea: React components map to an internal scene graph / mesh/materials pipeline handled by a custom reconciler.
-   Why structure matters: rendering and layout are decoupled — Yoga is used for layout calculations while renderer code creates Wonderland Engine meshes/materials and updates transforms.
-   Main technologies: TypeScript, React, Wonderland Engine, Yoga Layout, Vitest, Web Test Runner.
-   Follow the [Wonderland Engine guidelines](wonderland-instructions.md) conventions for Wonderland Engine development.

2. Where to look (recommended entry points)

-   Public entry: `js/index.ts` and `js/react-ui.tsx` — how the package is exported and the React entry.
-   Components & props: `js/components.tsx` — top-level components (Button, Text, Panel, Column/Row, Image, ProgressBar).
-   Layout & renderer: `js/renderer/*` — core renderer logic:
    -   `renderer/core.ts`, `renderer/layout.ts`, `renderer/mesh-helpers.ts`, `renderer/props-helpers.ts` and `renderer/reconciler-host.ts`.
-   Text & mesh: `renderer/text-helpers.ts`, `nine-slice.ts`, `rounded-rectangle-mesh.ts`.
-   Utilities: `js/utils.ts` and `renderer/position-helpers.ts`.
-   Example app: `example/` — a runnable example and prebuilt `deploy/` artifacts.

3. Build, test and debug workflows (explicit commands)

-   Build the package: `npm run build` (runs `tsc` — outputs `dist/` and type files).
-   Watch for local development: `npm run watch` (tsc --watch).
-   Run unit tests: `npm run test:unit` (Vitest, happy-dom environment, config in `vitest.config.ts`).
-   Run integration / web tests: `npm run test` (builds first then runs `web-test-runner`).
-   CI full tests: `npm run test:ci` (build + vitest + web-test-runner).

Notes: many tests import compiled output, so `npm run build` is required before `web-test-runner` tests.

4. Project-specific conventions and gotchas

-   Renderer is not DOM-based: do not look for DOM APIs. Instead, changes usually create/update Wonderland Engine materials, meshes and transforms.
-   Colors are numeric RGBA values (e.g. `0xff00ffff`), used across components and materials.
-   Size props accept numbers or percent-strings (see `js/components.tsx` and tests in `test/unit`).
-   Yoga layout is used — layout code lives in `renderer/layout.ts` and tests assert Yoga behavior in `test/unit/layout.test.ts`.
-   Public package shape: `package.json` uses `type: "module"` and exports `./dist/index.js` and `./dist/components.js` — when adding public files update `exports` and `files`.
-   Prettier config: repository uses `@wonderlandengine/prettier-config` — follow the existing formatting rules.

5. Integration points & external dependencies

-   Peer dependencies must be satisfied by consumer projects: `@wonderlandengine/api`, `@wonderlandengine/components`, `react`, `yoga-layout`, `gl-matrix` (see `package.json`).
-   Example project links the local package (see `example/package.json` using `file:..`). The example expects a Wonderland Editor (open `example/ReactUi.wlp`).
-   Web / WASM runtime: integration tests or examples may rely on runtime artifacts in `example/deploy/` (WASM/worker files). Tests that need runtime artifacts are run via `web-test-runner` and Chai.

6. Tests & fast verification

-   Unit tests: `test/unit/*.test.ts` — Each test file should have a corresponding .ts file in the /js folder and it's subfolders.
-   Vitest config: `vitest.config.ts` uses `happy-dom`, and includes `test/unit/**/*.test.{ts,js}`.

7. Small examples to copy/paste (real code locations)

-   Material context usage (see README and `js/react-ui.tsx`):

    MaterialContext.Provider value = { panelMaterial?, panelMaterialTextured?, textMaterial? }

-   Button usage example (see `README.md` and `js/components.tsx`):

    <Button onClick={() => {}} hovered={{ backgroundColor: 0xff0000ff }} padding={20}><Text>Click</Text></Button>

8. When editing source consider these rules

-   Keep public API stable: exports are defined in `package.json` and compiled to `dist/` by `tsc` — run `npm run build` and update tests accordingly.
-   Add unit tests for layout/mesh changes — many subtle bugs are caught by `layout.test.ts`, `mesh-helpers.test.ts`, and `text-helpers.test.ts`.
-   If you add new renderer capabilities, mirror them in `renderer/*` and add tests to `test/unit`.

9. Useful files to reference quickly

-   `js/components.tsx` — component props and patterns.
-   `js/index.ts`, `js/react-ui.tsx` — package entry points.
-   `js/renderer/*` — reconciliation, layout and mesh logic.
-   `test/unit/` — how features are exercised in tests.
-   `example/` — how to run and what the runtime expects (Editor project and `deploy/` artifacts).
