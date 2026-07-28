# lib/relations/

One file per relation type (the largest subtree). A **relation is a directed edge**: a single reference from a source asset (`from`) to a target asset (`to`), plus the knowledge of how to read, rewrite, inline, and remove that specific pointer in the source asset's parse tree. This directory is pure edge-modeling. The *discovery* of relations lives in `lib/assets/` (each asset's `findOutgoingRelationsInParseTree()`); relations do not find themselves.

Registration is automatic (see the root `CLAUDE.md`): the filename is the type string, stamped onto the prototype by the loader. There is no in-file `type` declaration, so renaming a file silently renames the relation type.

## The base class: `Relation.js`

`class Relation` (`isRelation: true`). The contract for a subclass:

**Must implement** `get href()` / `set href(v)` - the only truly mandatory override. It reads and writes the actual pointer text in the parent asset's parse-tree node: a DOM attribute (`HtmlImage`), a `url(...)` token (`CssImage`), a JS AST literal. Everything else is driven off `href`.

**Usually override:**

- `attach(position, adjacentRelation)` - create the parse-tree node, then call `super.attach(...)`. `position` is one of `first`/`last`/`before`/`after` (HTML adds `firstInHead`/`lastInBody`, etc.). The base handles graph bookkeeping and calls `refreshHref()`.
- `detach()` - remove the node/token from the parse tree, then `super.detach()`.
- `inline()` - only for inlinable types (data: URL, inline `<script>`/`<style>`). The base handles the graph side (cloning the target if it has other incoming relations); the subclass writes the inline form via `href`. For HTML, override `inlineHtmlRelation()`, not `inline()`.

**Provided by the base, do not reimplement:** `to`/`from`, `refreshHref()` (recomputes `href` from `to.url` and `hrefType`, called automatically on URL changes), `hrefType`, `fragment`, `crossorigin`, `canonical`, `baseUrl`, `remove`. Class-level props set on the prototype: `targetType`, `attributeName`, `preferredPosition`.

## Naming convention and families

**`<ContainingAssetType><WhatItPointsTo>.js`**, PascalCase, filename == registered type. The prefix is the asset type whose parse tree holds the pointer. Families, each with a family base class:

- **`Html*`** (largest, ~45) extend `HtmlRelation.js`: `HtmlAnchor`, `HtmlScript`, `HtmlImage`, `HtmlStyle`, `HtmlIFrame`, `HtmlPreloadLink`, `HtmlImageSrcSet`, ... `HtmlRelation` centralizes the intricate DOM insertion logic (head/body creation, `preferredPosition`).
- **`Css*`** extend `CssUrlTokenRelation.js` (a regex tokenizer over `url(...)`; its `attach` throws, since CSS references cannot be freely inserted): `CssImage`, `CssImport`, `CssFontFaceSrc`, `CssSourceMappingUrl`, ...
- **`JavaScript*`** extend `JavaScriptRelation.js`: `JavaScriptImport`, `JavaScriptDynamicImport`, `JavaScriptSourceUrl`, `JavaScriptStaticUrl`, `JavaScriptWebWorker`, ...
- **`Svg*`** extend `SvgRelation.js`: `SvgUse`, `SvgImage`, `SvgScript`, ...
- Smaller/one-off: `Xml*`, `Rss*`, `SystemJs*`, `SrcSetEntry`, `SourceMap*`, `CacheManifestEntry`, `FileRedirect`, `HttpRedirect`.

Root base plus the four family bases: `Relation.js`, `HtmlRelation.js`, `CssUrlTokenRelation.js`, `JavaScriptRelation.js`, `SvgRelation.js`.

## Canonical example

`HtmlImage.js` (~55 lines) is the minimal template: `get/set href` via `node.getAttribute/setAttribute(this.attributeName)`; `attach` creates the `<img>` then `super.attach`; base `detach` removes the node; extra attribute accessors buffer into `_`-prefixed fields when detached. `HtmlScript.js` adds `async`/`defer` accessors and a custom `inlineHtmlRelation()`.

## Adding a new relation type

1. Add `lib/relations/<AssetType><Name>.js` extending the right family base; implement `get/set href`, and `attach`/`detach` (and `inlineHtmlRelation()`) if insertable/inlinable.
2. Set prototype props (`targetType`, `attributeName`, `preferredPosition`).
3. Emit it from the containing asset's `findOutgoingRelationsInParseTree()` in `lib/assets/`. Auto-registration handles the rest.

## Gotchas

- **`node` is dropped on detach.** Subclasses null `this.node` after detaching, so attribute state must be buffered into `_`-prefixed fields (e.g. `HtmlImage._decoding`, `HtmlScript._async`) or it is lost.
- **Not every relation supports `attach`/`inline`.** `CssUrlTokenRelation.attach()` throws; only override `inline` where the format allows it.
- **Reuse `HtmlRelation.attach`'s insertion logic**; it handles head/body creation and positioning. Do not reinvent it, and do not assume append (`attach` needs an explicit `position`).
- **`markDirty()` after mutating the tree.** The base helpers do it in `attach`/`detach`/`refreshHref`, but custom setters (`async`, `decoding`) must call `this.from.markDirty()` themselves.
- **The `to` setter has side effects** (routes through `assetGraph.addAsset`, clears the old inline link, calls `refreshHref`). Only low-level code sets `_to` directly.
