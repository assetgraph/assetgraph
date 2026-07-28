# AssetGraph

AssetGraph is a node.js framework that models a website as a dependency graph: **assets** (HTML, CSS, JS, images, fonts, ...) are the nodes, **relations** (an `<img src>`, a `url(...)` in CSS, an `import`) are the directed edges, and **transforms** are operations that mutate the graph (load, populate, inline, move, minify, bundle, write to disc). It is the engine under assetgraph-builder, subfont, and hyperlink.

Main module: `lib/AssetGraph.js`. Current line: v7 (this branch descends from `v7`).

## Test coverage is required

Every code modification must ship with full test coverage: any new behaviour, bug fix, or changed code path needs tests that exercise it, written to the existing conventions in `test/CLAUDE.md`. Add the test alongside the source change in the mirrored `test/` location, use the Unexpected assertion harness and the fixture layout the suite already uses, and confirm `npm test` and `npm run lint` pass before considering the change done. Do not introduce a new assertion style, test runner, or fixture pattern; match what is there.

## The mental model

- **Asset = node.** A file (or inline blob) with content. See `lib/assets/` and its `CLAUDE.md`.
- **Relation = edge.** A single pointer from a source asset to a target asset, plus the knowledge of how to read/rewrite/inline/remove that pointer. See `lib/relations/` and its `CLAUDE.md`.
- **Transform = operation.** A function that mutates the whole graph. See `lib/transforms/` and its `CLAUDE.md`.

Assets discover their own outgoing relations by parsing their content (`findOutgoingRelationsInParseTree`); relations resolve to target assets; `populate` follows relations to pull the rest of the graph in. This is auto-discovery: you seed a few assets and let the graph fill itself.

## The fluent API

`AssetGraph` and `TransformQueue` share a chaining API. Every transform in `lib/transforms/` is auto-registered as a method on both, so:

```js
const AssetGraph = require('assetgraph');
await new AssetGraph({ root: 'file:///path/to/site/' })
  .loadAssets('*.html')   // seed assets
  .populate()             // follow relations, discover the whole graph
  .inlineRelations({ type: 'HtmlStyle' })
  .writeAssetsToDisc({ url: { $regex: '^file:' } });
```

Calling a transform enqueues it; the queue is a thenable and runs the transforms **sequentially** when awaited (`lib/TransformQueue.js`). `.if()`/`.else()`/`.endif()` gate whether following transforms get enqueued, evaluated at build time.

## Queries

`findAssets(query)` and `findRelations(query)` take Mongo-style query objects (compiled by `lib/compileQuery.js` over `sift`) or a predicate function:

```js
ag.findAssets({ type: 'Html' });
ag.findAssets({ isImage: true, url: { $regex: '^file:' } });
ag.findRelations({ type: 'HtmlScript', to: { isLoaded: true } });
ag.findAssets(asset => ag.findRelations({ to: asset }).length === 0);
```

Passing an Asset/Relation instance as a value matches by its `id`. Query by boolean flags (`isImage`, `isText`, `isInline`, `isLoaded`) rather than `instanceof`. Note: `findRelations` only sees relations of already-populated assets, so query after `.populate()`.

## Auto-registration (important)

At load time `lib/AssetGraph.js` scans `lib/assets/`, `lib/relations/`, and `lib/transforms/` and registers every file by its filename. **The filename IS the type/method name.** Dropping a new file in one of those directories wires it up automatically; there is no index to edit, and renaming a file silently renames the type. Assets are required eagerly; relations and transforms are lazy getters.

## Top-level `lib/` helpers

- `AssetGraph.js` - the graph model, the API surface, and the registry.
- `TransformQueue.js` - the sequential transform-chaining engine.
- `compileQuery.js` - compiles query objects (wraps `sift`); core of all `findAssets`/`findRelations`.
- `parseJavaScript.js` - Acorn-based JS parser producing an espree-compatible AST.
- `parseExpression.js` / `matchSourceExpression.js` - JS expression parsing and CSP source-expression matching.
- `replaceDescendantNode.js` / `combineJavaScriptAsts.js` - AST manipulation helpers (node swap, bundling).
- `assetGraphConditions.js` - parse/stringify the `data-assetgraph-conditions` attribute.
- `errors.js` - error classes (`ParseError`, `SyntaxError`, `NotImplementedError`, ...).
- `canonicalizeObject.js` - recursive key sort for deterministic serialization.
- `util/` - small shared helpers (asset relocation, data-URL parsing, file-type sniffing, CSS pseudo-class regexes, SVG namespace shims).

## Building and testing

There is no build step: this is plain JavaScript shipped as-is, with `main` pointing at `lib/AssetGraph.js`. Do not look for a transpile or bundle stage.

- `npm test` - runs the full mocha suite. It is large (146 test files against ~34MB of fixtures) and slow. While iterating, run only the single mirrored file instead: `npx mocha test/<subject>.js` (see `test/CLAUDE.md` for the mirror layout). Reserve the full `npm test` for a final check.
- `npm run lint` - `eslint . && prettier --check '**/*.js'`.
- `npm run coverage` - nyc over `lib/**`. `npm run ci` = coverage + lint.
- `npm run docs` - jsdoc (`jsdoc.json`, plugins in `jsdoc-plugins/`). The codebase is heavily jsdoc-annotated; the docblocks are a reliable source of truth for the public API.

For how to write tests (the Unexpected harness, fixtures, the setup patterns, and the lint/leak rules that fail the build), see `test/CLAUDE.md`. Coverage is required for every change; see the section above.

To see a change work, the fastest path is to run or adapt the mirrored `test/<subject>.js`; for interactive poking, chain the `startRepl` transform (`.startRepl()`) to drop into a Node REPL with `assetGraph` in scope.

Commit messages feed the changelog: `preversion` regenerates `CHANGELOG.md` from git history with `offline-github-changelog`, so write clear, self-contained commit subjects.

Reading efficiently: several core files are large (`lib/assets/Asset.js` ~1600 lines, `lib/transforms/bundleSystemJs.js` ~1400, `lib/assets/Html.js` ~1000, `lib/AssetGraph.js` ~990). Navigate to the specific method or the override point named in the per-directory `CLAUDE.md`, rather than reading these top to bottom.

## Gotchas

- **`assetGraph.warn(err)` throws if there is no `warn` listener.** Many operations funnel through it, so tools and tests usually attach a `warn` handler.
- **Assets serialize lazily and cache.** Mutating an asset's `parseTree` requires calling `markDirty()` or a stale cached `rawSrc`/`text` is returned. See `lib/assets/CLAUDE.md`.
- **Assets upgrade their prototype in place** after `load()` infers the real type. Do not cache an asset's `constructor`/`type` across a load.
- `.nvmrc` pins Node 12, but the suite runs fine on modern Node (verified on Node 24). Do not waste effort downgrading; the pin is stale, not a hard requirement. The code does use `bluebird` promises and old idioms, so occasional deprecation noise is expected.
- **Dependencies drift.** There is no lockfile and `.npmrc` sets `package-lock=false` and `save-exact=false`, so `npm install` pulls the latest semver-compatible versions. A test that fails right after an install may be dependency drift, not your change (the current `v7` HEAD is literally a commit fixing tests that broke on a new dependency version). Triage with that in mind before assuming your edit is at fault.
- **`testdata/`, `lib/3rdparty/`, and `examples/` are not linted or formatted** (excluded in `.eslintignore`/`.prettierignore`). Test fixtures under `testdata/` are byte-sensitive: tests assert on exact content, so never reformat or "clean up" a fixture. `lib/3rdparty/` is vendored code; do not restyle it.
- `addAsset` takes exactly one asset and rejects arrays/globs by design; use `addAssets` or the `loadAssets` transform for many.

## Per-directory notes

The three large subtrees each have their own `CLAUDE.md`:

- `lib/assets/CLAUDE.md` - the Asset base class, the type hierarchy, the serialize/round-trip contract.
- `lib/relations/CLAUDE.md` - the Relation base class, the `<Container><Target>` naming convention, the attach/detach/inline contract.
- `lib/transforms/CLAUDE.md` - the transform factory shape, the queue, and the families of transforms.
- `test/CLAUDE.md` - the test conventions (layout, the Unexpected harness, fixtures, warnings/sinon) that every change must follow.
