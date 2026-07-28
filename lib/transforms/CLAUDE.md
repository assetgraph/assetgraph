# lib/transforms/

One file per transform. A **transform is an operation on the whole graph**: it queries assets/relations and mutates them in place. Transforms are the verbs of the fluent API. Registration is automatic (see the root `CLAUDE.md`): the filename is the method name.

## Module shape

The default export is a **factory that takes options and returns the actual transform function**. The inner function takes the `assetGraph` and mutates it.

```js
module.exports = (queryObj, otherOptions) => {
  return function transformName(assetGraph) {
    for (const relation of assetGraph.findRelations(queryObj)) {
      relation.inline();
    }
  };
};
```

**Name the inner function** - that name shows up in error messages and the `beforeTransform`/`afterTransform` events.

**Three execution styles**, detected by the inner function's arity in `AssetGraph._runTransform`:

- Sync: `(assetGraph)`, returns nothing. Example: `inlineRelations.js`, `moveAssets.js`.
- Async: `async (assetGraph)` returning a promise. Example: `populate.js`, `loadAssets.js`, `writeAssetsToDisc.js`.
- Node callback: `(assetGraph, cb)`, arity >= 2.

Do not mix styles: taking a `cb` and also returning a promise is explicitly rejected. Sync transforms are still deferred via `setImmediate`, so never rely on synchronous completion after enqueuing; always `await` / `.run()` the queue.

## How they run

Every file here is auto-registered as a method on both `AssetGraph.prototype` and `TransformQueue.prototype`. Calling `assetGraph.someTransform(opts)` starts a `TransformQueue`; each further call enqueues. The queue (`lib/TransformQueue.js`) is a thenable that runs the transforms **strictly sequentially** when awaited. `.if()`/`.else()`/`.endif()` gate enqueuing, evaluated at build time (a transform pushed under a falsy condition is silently dropped).

## Conventions for a new transform

- Filename = method name, camelCase. Export a factory; name the inner function.
- First factory arg is conventionally a `queryObj` passed to `findAssets`/`findRelations`; a second is often a target (a new URL or a function).
- Query with `assetGraph.findAssets(...)` / `findRelations(...)`; mutate through asset/relation methods (`asset.load()`, `relation.inline()`, `asset.url = ...`, `assetMover` from `../util/`), not by rebuilding the graph.
- Report recoverable problems via `assetGraph.warn(err)` / `info(err)`, not by throwing. (Remember `warn` throws if nothing is listening.)

## Families (grouping the ~53 transforms)

- **Load / populate:** `loadAssets`, `populate`, `updateAssets`, `executeJavaScriptInOrder`.
- **Inline:** `inlineRelations`, `inlineCriticalCss`, `inlineHtmlTemplates`, `convertStylesheetsToInlineStyles`, ...
- **Move / rename / URL:** `moveAssets`, `moveAssetsInOrder` (topological, hash-safe), `externalizeRelations`.
- **Minify / optimize:** `compressJavaScript`, `minifySvgAssetsWithSvgo`, `autoprefixer`, `gzip`, `stripDebug`, `mergeIdenticalAssets`, ...
- **Bundle:** `bundleRelations`, `bundleRequireJs`, `bundleSystemJs`, `bundleWebpack`.
- **Remove / prune:** `removeRelations`, `removeUnreferencedAssets`, `removeEmptyJavaScripts`, ...
- **Source maps:** `applySourceMaps`, `serializeSourceMaps`, `setSourceMapRoot`, `addJavaScriptSourceUrl`.
- **Markup fixups / metadata:** `setHtmlImageDimensions`, `setAsyncOrDeferOnHtmlScripts`, `addRelNoopenerToBlankTargetAnchors`, `duplicateFavicon`, ...
- **Security / correctness review:** `reviewContentSecurityPolicy`, `reviewSubResourceIntegrity`, `checkIncompatibleTypes`.
- **Service worker / offline:** `addCacheManifest`, `addPrecacheServiceWorker`.
- **Write output:** `writeAssetsToDisc`, `writeAssetsToStdout`, `writeStatsToStderr`.
- **Dev / debug:** `drawGraph`, `logEvents`, `startRepl`.

Read `inlineRelations.js` (minimal sync) and `populate.js` (async, query-driven BFS) as the two templates.

## Gotchas

- **Order dependence.** The queue is sequential and most transforms assume a pipeline: `loadAssets` then `populate` before anything can query relations; inline/minify/bundle before `moveAssets`/`writeAssetsToDisc`; writing last.
- **Hashing vs moving.** Renaming an asset to a content-hash URL changes the hashes of assets referencing it. Use `moveAssetsInOrder` (computes a topological order, warns and bails on cycles), not plain `moveAssets`, when hashing.
- **`writeAssetsToDisc` reads a non-public field** (`fileRedirectTargetUrl`), flagged smelly in-code. Be cautious copying it as a template.
