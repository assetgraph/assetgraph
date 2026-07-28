# lib/assets/

One file per asset type. An **asset is a node** in the graph: a file (or inline blob) with content, a URL, and a set of outgoing relations discovered by parsing that content. The base classes (`Asset`, `Text`, `Image`, `Font`, `Xml`) live here alongside the concrete types. Registration is automatic (see the root `CLAUDE.md`): the filename is the type name.

## The base class: `Asset.js`

`class Asset extends EventEmitter`. Read this file before touching any subclass; it is large (~1600 lines) but the contract is small.

**Three-layer body representation** is the core idea. An asset caches up to three coupled forms of its content:

- `_rawSrc` - a `Buffer` of the bytes (getter/setter `rawSrc`).
- `_text` - the decoded string (added by `Text`, not the base).
- `_parseTree` - the high-level DOM/AST (added per subclass).

The getters compute one layer from another on demand (lazy serialization). Because they are cached, **mutating `parseTree` requires calling `markDirty()`** to clear the stale `_rawSrc`/`_text`; otherwise a later `rawSrc`/`text` read returns pre-mutation bytes. This is the round-trip contract.

**Lifecycle:** `load()` is the only async method: it fetches `file:`/`http(s):` bytes, sets content type/encoding, then infers the real type and upgrades the instance's prototype in place (`_upgrade` via `Object.setPrototypeOf`), then populates relations. `unload()` drops all cached layers. `isLoaded` is derived (true if any body layer is present), not a stored flag.

**Relations:** `findOutgoingRelationsInParseTree()` is the primary override point for a subclass with structured content. It walks the parse tree and returns relation config objects like `{ type: 'HtmlScript', href, node }`. The base `outgoingRelations` getter vivifies those configs into real `Relation` instances (and creates target assets). Relations are defined in `lib/relations/`; this directory only discovers them.

## Contract a subclass must satisfy

Minimum: set `contentType` and `supportedExtensions` on the prototype (`Object.assign(X.prototype, {...})`). If the type has structured content, add a `parseTree` getter/setter and override `findOutgoingRelationsInParseTree()`. `Text` subtypes also get `text`/`encoding` and usually override `prettyPrint()`/`minify()`/`_cloneParseTree()`. Set a boolean `is<Type>` flag so callers can query by flag instead of `instanceof`.

## Type hierarchy

```
Asset
├── Text                text/plain
│   ├── Html            text/html
│   │   └── Htc
│   ├── Xml             application/xml
│   │   ├── Svg (also isImage), Atom, Rss, Xslt, MsApplicationConfig
│   ├── Css             text/css
│   ├── JavaScript      application/javascript
│   ├── Json            application/json
│   │   ├── ApplicationManifest, I18n, SourceMap
│   ├── CacheManifest, ContentSecurityPolicy, SrcSet
├── Image               isImage (raster base; devicePixelRatio logic)
│   ├── Avif, Gif, Ico, Jpeg, Png, Webp
├── Font                isFont
│   ├── Eot, Otf, Ttf, Woff, Woff2
└── Flash
```

Note `Html` and `Xml` are siblings under `Text`, not a chain. The leaf image/font files are near-empty: they only assign `contentType` + `supportedExtensions`.

## Parsers each type wraps

- Html / Xml (and Svg, Atom, Rss, ...): `jsdom`. `parseTree` is a jsdom `document`.
- Css: `postcss` (parse), `cssnano` (minify). `parseTree` is the PostCSS AST.
- JavaScript: `../parseJavaScript` (Acorn, estree AST), `escodegen` to serialize.
- Json (and subtypes): `JSON.parse`/`stringify`, plain object tree.
- Image/Font leaves: opaque bytes, no parse tree, no relations.

## Adding a new asset type

Drop `lib/assets/<Type>.js` extending the right base, assign `contentType` + `supportedExtensions`, add `is<Type>`, and (if structured) implement `parseTree` and `findOutgoingRelationsInParseTree()`. Auto-registration wires the content-type and extension lookups. If the type shares a Content-Type with its parent (as `I18n`/`SourceMap` do with JSON, and all Fonts/Images do with octet-stream), set `notDefaultForContentType` or registration warns and clobbers the parent mapping.

## Gotchas

- **Round-tripping:** always `markDirty()` after mutating `parseTree`, or cached bytes go stale.
- **In-place prototype upgrade:** `load()` reclassifies the instance; do not cache `constructor`/`type` across a load. Upgrade is only allowed from a superclass (plus Image/Font to Svg).
- jsdom-backed types (`Html`, `Xml`) close their window in `unload()`; a new jsdom-backed subtype that skips this leaks.
- `Css.js` monkeypatches PostCSS's SourceMapGenerator at module scope, so merely requiring the Css asset has a global side effect.
- `Text` encoding depends on optional native `iconv` with fallbacks; non-utf8 round-trips can transliterate on encode errors.
- A stale docblock in `Asset.js` says Css uses CSSOM; it actually uses PostCSS. Trust the code.
