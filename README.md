# AssetGraph

[![NPM version](https://badge.fury.io/js/assetgraph.svg)](http://badge.fury.io/js/assetgraph)
[![Build Status](https://travis-ci.org/assetgraph/assetgraph.svg?branch=master)](https://travis-ci.org/assetgraph/assetgraph)
[![Coverage Status](https://img.shields.io/coveralls/assetgraph/assetgraph.svg)](https://coveralls.io/r/assetgraph/assetgraph?branch=master)
[![Dependency Status](https://david-dm.org/assetgraph/assetgraph.svg)](https://david-dm.org/assetgraph/assetgraph)

AssetGraph is an extensible, <a href="http://nodejs.org/">node.js</a>-based
framework for manipulating and optimizing web pages and web
applications. The main core is a dependency graph model of your entire website, where all assets are treated as first class citizens. It can automatically dicsover assets based on your declarative code, reducing the configuration needs to a minimum.

If you just want to get started with the basics, read [Peter Müller - Getting started with Assetgraph](http://mntr.dk/2014/getting-started-with-assetgraph/).

If you are looking for a prepackaged build system take a look at <a
href="https://github.com/assetgraph/assetgraph-builder">Assetgraph-builder</a>.

## Tools built with AssetGraph

- [assetgraph-builder](https://www.npmjs.com/package/assetgraph-builder) - A static web page build system that post-processes your website with extremely little configuration
- [subfont](https://www.npmjs.com/package/subfont) - A tool that supercharges your webfont loading by automatically applying all best practice loading techniques and generating optimal font subsets
- [hyperlink](https://www.npmjs.com/package/hyperlink) - A link checker tool that will ensure all your internal and external links are intact and up to date
- [seespee](https://www.npmjs.com/package/seespee) - A Content-Security Policy generator. Point it at a webpage and it will tell you what policy you need as a minimum
- [trackingdog](https://github.com/papandreou/trackingdog) - cli for finding the original source location of a line+column in a generated file, utilizing the source map

# Assets and relations

All web build tools, even those that target very specific problems,
have to get a bunch of boring stuff right just to get started, such
as loading files from disc, parsing and serializing them, charsets,
inlining, finding references to other files, resolution of and
updating urls, etc.

The observation that inspired the project is that most of these
tasks can be viewed as graph problems, where the nodes are the
assets (HTML, CSS, images, JavaScript...) and the edges are the
relations between them, e.g. anchor tags, image tags, favorite
icons, css background-image properties and so on.

<img style="margin: 0 auto;" src="http://gofish.dk/assetgraph/datastructure.png">

An AssetGraph object is a collection of assets (nodes) and the
relations (edges) between them. It's a basic data model that allows
you to populate, query, and manipulate the graph at a high level of
abstraction. For instance, if you change the url of an asset, all
relations pointing at it are automatically updated.

Additionally, each individual asset can be inspected and massaged
using a relevant API: <a
href="https://github.com/tmpvar/jsdom">jsdom</a> for HTML, <a href="https://github.com/postcss/postcss">PostCSS</a> for CSS, and an <a
href="http://esprima.org/">Esprima</a> AST for Javascript.

AssetGraph represents inline assets the same way as non-inline ones,
so eg. inline scripts, stylesheets, and images specified as `data:`
urls are also first-class nodes in the graph. This means that you
don't need to dig into the HTML of the containing asset to manipulate
them. An extreme example would be an Html asset with a conditional
comment with an inline stylesheet with an inline image, which are
modelled as 4 separate assets:

```html
<!DOCTYPE html>
<html>
<head>
  <!--[if !IE]> -->
    <style type='text/css'>
      body {
        background-image: url(data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==);
      }
    </style>
  <!-- <![endif]-->
</head>
<body></body>
</html>
```

These are some of the supported assets and associated relation types:

#### HTML

`<a>`, `<link rel="stylesheet|shortcut icon|fluid-icon|alternate|serviceworker">`, `<script>`, `<style>`,
`<html manifest="...">` `<img>`, `<video>`, `<audio>`, `<applet>`,
`<embed>`, `<esi:include>`, `<iframe>`, `<svg>`, `<meta property="og:...">`

#### SVG

`<style>`, inline `style=...` attributes, event handlers, `<?xml-stylesheet href=...>`, `<font-face-src>`

#### CSS

`//# sourceMappingURL=...`, `background-image: url(...)`, `@import url(...)`, `behavior: url(...)`,
`filter: AlphaImageLoader(src='...')`, `@font-face { src: url(...) }`

#### JavaScript

`//# sourceMappingURL=...`, homegrown `'foo/bar.png'.toString('url')` syntax for referencing external files

#### Web manifest

Icon urls, `related_applications`, `start_url`, etc.

#### Cache manifest (appcache)

Entries in the `CACHE`, `NETWORK` and `FALLBACK` sections

#### JSON, XML, PNG, GIF, JPEG, ICO

(none)

# Features

* Build an AssetGraph programmatically or load it from disk or a
  remote server via http.
* Find explicit dependencies between JavaScript and CSS and roll them
  out as `<script>` and `<link rel='stylesheet'>` tags in your
  HTML.
* Bundle and inline CSS and JavaScript.
* Create a cache manifest with references to all the assets your web
  app needs to be usable offline.
* Move all CSS, JavaScript, image assets etc. to a static dir and
  rename them to md5.extension so the web server can be configured to
  set a far-future Cache-Control.
* Help getting your static assets on a CDN by allowing you to easily
  rewrite all references to them.
* Use Graphviz to visualize your dependencies at any step.
* Using the separate <a
href="https://github.com/assetgraph/assetgraph-sprite">assetgraph-sprite
  transform</a>: Optimize CSS background images by creating sprite
  images. The spriting is guided by a set of custom CSS properties
  with a `-ag-sprite` prefix.

# Installation

Make sure you have <a href="http://nodejs.org/">node.js</a> and <a
href="http://npmjs.org/">npm</a> installed, then run:

```
$ npm install assetgraph
```

## Querying the graph

AssetGraph supports a flexible syntax for finding assets and relations
in a populated graph using the `findAssets` and `findRelations`
methods. Both methods take a query object as the first argument.
The query engine uses MongoDB-like queries via the
[sift module](https://github.com/crcn/sift.js). Please consult that
to learn about the advanced querying features. Below are some basic examples.

Get an array containing all assets in the graph:

```javascript
var allAssets = assetGraph.findAssets();
```

Find assets by type:

```javascript
var htmlAssets = assetGraph.findAssets({ type: 'Html' });
```

Find assets of different named types:

```javascript
var jsAndCss = assetGraph.findAssets({ type: { $in: ['Css', 'JavaScript' ] });
```

Find assets by matching a regular expression against the url:

```javascript
var localImageAssets = assetGraph.findAssets({
  url: { $regex: /^file:.*\.(?:png|gif|jpg)$/ }
});
```

Find assets by predicate function:

```javascript
var orphanedJavaScriptAssets = assetGraph.findAssets(function(asset) {
  return (
    asset.type === 'JavaScript' &&
    assetGraph.findRelations({ to: asset }).length === 0
  );
});
```

Find all HtmlScript (`<script src=...>` and inline `<script>`) relations:

```javascript
var allHtmlScriptRelations = assetGraph.findRelations({ type: 'HtmlScript' });
```

Query objects have "and" semantics, so all conditions must be met for
a multi-criteria query to match:

```javascript
var textBasedAssetsOnGoogleCom = assetGraph.findAssets({
  isText: true,
  url: { $regex: /^https?:\/\/(?:www\.)google\.com\// }
});
```

Find assets by existence of incoming relations:

```javascript
var importedCssAssets = assetGraph.findAssets({
  type: 'Css',
  incomingRelations: { $elemMatch: { type: 'CssImport' } }
});
```

Relation queries can contain nested asset queries when querying the
`to` and `from` properties.

Find all HtmlAnchor (`<a href=...>`) relations pointing at local images:

```javascript
assetGraph.findRelations({
  type: 'HtmlAnchor',
  to: { isImage: true, url: { $regex: /^file:/ } }
});
```

# Transforms and workflows

AssetGraph comes with a collection of premade "transforms" that you
can use as high level building blocks when putting together your build
procedure. Most transforms work on a set of assets or relations and
usually accept a query object so they can be scoped to work on only a
specific subset of the graph.

Usually you'll start by loading some initial assets from disc or via
http using the `loadAssets` transform, then get the related assets
added using the `populate` transform, then do the actual
processing. Eventually you'll probably write the resulting assets back
to disc.

Thus the skeleton looks something like this:

```javascript
var AssetGraph = require('assetgraph');

const assetGraph = new AssetGraph({ root: '/the/root/directory/' });

await assetGraph.loadAssets('*.html'); // Load all Html assets in the root dir
await assetGraph.populate({ followRelations: { type: 'HtmlAnchor' } }); // Follow <a href=...>
// More work...
await assetGraph.writeAssetsToDisc({ type: 'Html' }); // Overwrite existing files

// Done!
```

In the following sections the built-in transforms are documented
individually:

## assetGraph.addCacheManifest([queryObj])

Add a `CacheManifest` asset to each `Html` asset in the graph (or
to all `Html` assets matched by `queryObj` if provided). The cache
manifests will contain relations to all assets reachable by traversing
the graph through relations other than `HtmlAnchor`.

## assetGraph.bundleRelations(queryObj[, strategyName])

Bundle the `Css` and `JavaScript` assets pointed to by the
relations matched by `queryObj`.

The `strategyName` (string) parameter can be either:

#### `oneBundlePerIncludingAsset` (the default)

Each unique asset pointing to one or more of the assets being
bundled will get its own bundle. This can lead to duplication if
eg. several `Html` assets point to the same sets of assets, but
guarantees that the number of http requests is kept low.

#### `sharedBundles`

Create as many bundles as needed, optimizing for combined byte size
of the bundles rather than http requests. Warning: Not as well
tested as `oneBundlePerIncludingAsset`.

Note that a conditional comment within an `Html` asset conveniently
counts as a separate including asset, so in the below example
`ie.css` and `all.css` won't be bundled together:

```html
<!--[if IE]><link rel='stylesheet' href='ie.css'><![endif]-->
<link rel='stylesheet' href='all.css'>
```

The created bundles will be placed at the root of the asset graph with
names derived from their unique id (for example
`file://root/of/graph/124.css`) and will replace the original
assets.

## assetGraph.compressJavaScript([queryObj[, compressorName[, compressorOptions]]])

Compresses all `JavaScript` assets in the graph (or those specified by
`queryObj`).

The `compressorName` (string) parameter can be either:

#### `uglifyJs` (the default and the fastest)

The excellent <a href="https://github.com/mishoo/UglifyJS">UglifyJS</a>
compressor. If provided, the `compressorOptions` object will be
passed to UglifyJS' `ast_squeeze` command.

#### `yuicompressor`

Yahoo's YUICompressor though Tim-Smart's <a
href="https://github.com/Tim-Smart/node-yui-compressor">node-yuicompressor
module</a>. If provided, the `compressorOptions` object will be
passed as the second argument to `require('yui-compressor').compile`.

#### `closurecompiler`

Google's Closure Compiler through Tim-Smart's <a
href="https://github.com/Tim-Smart/node-closure">node-closure
module</a>. If provided, the `compressorOptions` object will be
passed as the second argument to
`require('closure-compiler').compile`.

## assetGraph.convertCssImportsToHtmlStyles([queryObj])

Finds all `Html` assets in the graph (or those specified by
`queryObj`), finds all `CssImport` relations (`@import url(...)`) in inline and external CSS and converts them to
`HtmlStyle` relations directly from the Html document.

Effectively the inverse of `assetGraph.convertHtmlStylesToInlineCssImports`.

Example:

```html
<style type='text/css'>
    @import url(print.css) print;
    @import url(foo.css);
    body {color: red;}
</style>
```

is turned into:

```html
<link rel='stylesheet' href='print.css' media='print'>
<link rel='stylesheet' href='foo.css'>
<style type='text/css'>
    body {color: red;}
</style>
```

## assetGraph.convertHtmlStylesToInlineCssImports([queryObj])

Finds all `Html` assets in the graph (or those specified by
`queryObj`), finds all outgoing, non-inline `HtmlStyle` relations
(`<link rel='stylesheet' href='...'>`) and turns them into groups of
`CssImport` relations (`@import url(...)`) in inline
stylesheets. A maximum of 31 `CssImports` will be created per inline
stylesheet.

Example:

```html
<link rel='stylesheet' href='foo.css'>
<link rel='stylesheet' href='bar.css'>
```

is turned into:

```html
<style type='text/css'>
    @import url(foo.css);
    @import url(bar.css);
</style>
```

This is a workaround for <a
href="http://social.msdn.microsoft.com/Forums/en-US/iewebdevelopment/thread/ad1b6e88-bbfa-4cc4-9e95-3889b82a7c1d/">the
limit of 31 stylesheets in Internet Explorer <= 8</a>. This transform
allows you to have up to 31\*31 stylesheets in the development version
of your HTML and still have it work in older Internet Explorer
versions.

## assetGraph.drawGraph(fileName)

Uses the Graphviz `dot` command to render the current contents of the
graph and writes the result to `fileName`. The image format is
automatically derived from the extension and can be any of <a
href="http://www.graphviz.org/doc/info/output.html">these</a>. Using
`.svg` is recommended.

Requires Graphviz to be installed, `sudo apt-get install graphviz` on
Debian/Ubuntu.

## assetGraph.executeJavaScriptInOrder(queryObj[, context])

Experimental: For each JavaScript asset in the graph (or those matched by
queryObj), find all reachable `JavaScript` assets and execute them
in order.

If the `context` parameter is specified, it will be used as <a
href="http://nodejs.org/docs/latest/api/vm.html#vm.runInContext">the
execution context</a>. Otherwise a new context will be created using
<a
href="http://nodejs.org/docs/latest/api/vm.html#vm.createContext">vm.createContext</a>.

## assetGraph.externalizeRelations([queryObj])

Finds all inline relations in the graph (or those matched by
`queryObj`) and makes them external. The file names will be derived
from the unique ids of the assets.

For example:

```html
<script>foo = 'bar';</script>
<style type='text/css'>body {color: maroon;}</style>
```

could be turned into:

```html
<script src='4.js'></script>
<link rel='stylesheet' href='5.css'>
```

## assetGraph.inlineCssImagesWithLegacyFallback([queryObj[, options]])

Finds all `Html` assets in the graph (or those matched by
`queryObj`), finds all directly reachable `Css` assets, and
converts the outgoing `CssImage` relations (`background-image`
etc.) to `data:` urls, subject to these criteria:

1.  If `options.sizeThreshold` is specified, images with a greater byte size
    won't be inlined.

2.  To avoid duplication, images referenced by more than one
    `CssImage` relation won't be inlined.

3.  A `CssImage` relation pointing at an image with an `inline` GET
    parameter will always be inlined (eg. `background-image: url(foo.png?inline);`). This takes precedence over the first two
    criteria.

4.  If `options.minimumIeVersion` is specified, the `data:` url length
    limitations of that version of Internet Explorer will be honored.

If any image is inlined an Internet Explorer-only version of the
stylesheet will be created and referenced from the `Html` asset in a
conditional comment.

For example:

```javascript
await assetGraph.inlineCssImagesWithLegacyFallback(
  { type: 'Html' },
  { minimumIeVersion: 7, sizeThreshold: 4096 }
);
```

where `assetGraph` contains an Html asset with this fragment:

```html
<link rel='stylesheet' href='foo.css'>
```

and `foo.css` contains:

```css
body {
  background-image: url(small.png);
}
```

will be turned into:

```html
<!--[if IE]><link rel="stylesheet" href="foo.css"><![endif]-->
<!--[if !IE]>--><link rel="stylesheet" href="1234.css"><!--<![endif]-->
```

where `1234.css` is a copy of the original `foo.css` with the
images inlined as `data:` urls:

```css
body {
  background-image: url(data;image/png;base64, iVBORw0KGgoAAAANSUhE...);
}
```

The file name `1234.css` is just an example. The actual asset file
name will be derived from the unique id of the copy and be placed at
the root of the assetgraph.

## assetGraph.inlineRelations([queryObj])

Inlines all relations in the graph (or those matched by
`queryObj`). Only works on relation types that support inlining, for
example `HtmlScript`, `HtmlStyle`, and `CssImage`.

Example:

```javascript
await assetGraph.inlineRelations({ type: { $in: ['HtmlStyle', 'CssImage'] } });
```

where `assetGraph` contains an Html asset with this fragment:

```html
<link rel='stylesheet' href='foo.css'>
```

and `foo.css` contains:

```css
body {
  background-image: url(small.png);
}
```

will be turned into:

```html
<style type='text/css'>body {background-image: url(data;image/png;base64,iVBORw0KGgoAAAANSUhE...)}</style>
```

Note that `foo.css` and the `CssImage` will still be modelled as
separate assets after being inlined, so they can be manipulated the
same way as when they were external.

## assetGraph.loadAssets(fileName|wildcard|url|Asset[, ...])

Add new assets to the graph and make sure they are loaded, returning a promise
that fulfills with an array of the assets that were added. Several
syntaxes are supported, for example:

```javascript
const [ aHtml, bCss ] = await assetGraph.loadAssets('a.html', 'b.css'); // Relative to assetGraph.root
await assetGraph.loadAssets({
    url: "http://example.com/index.html",
    text: "var foo = bar;" // The source is specified, won't be loaded
});
```

`file://` urls support wildcard expansion:

```javascript
await assetGraph.loadAssets('file:///foo/bar/*.html'); // Wildcard expansion
await assetGraph.loadAssets('*.html'); // assetGraph.root must be file://...
```

## assetGraph.mergeIdenticalAssets([queryObj])

Compute the MD5 sum of every asset in the graph (or those specified by
`queryObj`) and remove duplicates. The relations pointing at the
removed assets are updated to point at the copy that is kept.

For example:

```javascript
await assetGraph.mergeIdenticalAssets({ type: { $in: ['Png', 'Css'] } });
```

where `assetGraph` contains an `Html` asset with this fragment:

```html
<head>
    <style type='text/css'>body {background-image: url(foo.png);}</style>
</head>
<body>
    <img src='bar.png'>
</body>
```

will be turned into the following if `foo.png` and `bar.png` are identical:

```html
<head>
    <style type='text/css'>body {background-image: url(foo.png);}</style>
</head>
<body>
    <img src='foo.png'>
</body>
```

and the `bar.png` asset will be removed from the graph.

## assetGraph.minifyAssets([queryObj])

Minify all assets in the graph, or those specified by
`queryObj`. Only has an effect for asset types that support
minification, and what actually happens also varies:

#### `Html` and `Xml`

Pure-whitespace text nodes are removed immediately.

#### `Json`, `JavaScript`, and `Css`

The asset gets marked as minified (`isPretty` is set to
`false`), which doesn't affect the in-memory representation
(`asset.parseTree`), but is honored when the asset is serialized.
For `JavaScript` this only governs the amount of whitespace
(<a href="https://github.com/estools/escodegen">escodegen</a>'s
`compact` parameter); for how to apply variable renaming and
other compression techniques see `assetGraph.compressJavaScript`.

Compare to `assetGraph.prettyPrintAssets`.

## assetGraph.moveAssets(queryObj, newUrlFunctionOrString)

Change the url of all assets matching `queryObj`. If the second
argument is a function, it will be called with each asset as the first
argument and the assetGraph instance as the second and the url of the
asset will be changed according to the return value:

* If a falsy value is returned, nothing happens; the asset keeps its
  current url.
* If a non-absolute url is returned, it is resolved from
  `assetGraph.root`.
* If the url ends in a slash, the file name part of the old url is
  appended.

Move all `Css` and `Png` assets to a root-relative url:

```javascript
await assetGraph.moveAssets({ type: 'Css' }, '/images/');
```

If the graph contains `http://example.com/foo/bar.css` and
`assetGraph.root` is `file:///my/local/dir/`, the resulting url will
be `file:///my/local/dir/images/bar.css`.

Move all non-inline `JavaScript` and `Css` assets to either
`http://example.com/js/` or `http://example.com/css/`, preserving
the current file name part of their url:

```javascript
await assetGraph.moveAssets(
  { type: { $in: ['JavaScript', 'Css'] }, isInline: false },
  (asset, assetGraph) =>
    `http://example.com/${asset.type.toLowerCase()}/${asset.fileName}`
);
```

The assets are moved in no particular order. Compare with
`assetGraph.moveAssetsInOrder`.

## assetGraph.moveAssetsInOrder(queryObj, newUrlFunctionOrString)

Does the same as `assetGraph.moveAssets`, but makes sure that the
"leaf assets" are moved before the assets that have outgoing relations
to them.

The typical use case for this is when you want to rename assets to
`<hashOfContents>.<extension>` while making sure that the hashes of
the assets that have already been moved don't change as a result of
updating the urls of the related assets after the fact.

Here's a simplified example taken from `buildProduction` in
<a href="http://github.com/assetgraph/assetgraph-builder">AssetGraph-builder</a>.

```javascript
await assetGraph.moveAssetsInOrder(
  { type: { $in: ['JavaScript', 'Css', 'Jpeg', 'Gif', 'Png'] } },
  asset => `/static/${asset.md5Hex.substr(0, 10)}${asset.extension}`
);
```

If a graph contains an `Html` asset with a relation to a `Css` asset
that again has a relation to a `Png` asset, the above snippet will
always move the `Png` asset before the `Css` asset, thus making it
safe to compute the md5 of the respective assets when the function is
invoked.

Obviously this only works for graphs (or subsets of graphs)
that don't contain cycles, and if that's not the case, an error will
be thrown.

## transforms.populate(options)

Add assets to the graph by recursively following "dangling
relations". This is the preferred way to load a complete web site or
web application into an `AssetGraph` instance after using
`assetGraph.loadAssets` to add one or more assets to serve as the
starting point for the population. The loading of the assets happens
in parallel.

The `options` object can contain these properties:

#### `from`: queryObj

Specifies the set assets of assets to start populating from
(defaults to all assets in the graph).

#### `followRelations`: queryObj

Limits the set of relations that are followed. The default is to
follow all relations.

#### `onError`: function (err, assetGraph, asset)

If there's an error loading an asset and an `onError` function is
specified, it will be called, and the population will continue. If
not specified, the population will stop and pass on the error to its
callback. (This is poorly thought out and should be removed or
redesigned).

#### `concurrency`: Number

The maximum number of assets that can be loading at once (defaults to 100).

Example:

```javascript
const assetGraph = new AssetGraph();
await assetGraph.loadAssets('a.html');
await assetGraph.populate({
  followRelations: {
    type: 'HtmlAnchor',
    to: { url: { $regex: /\/[bc]\.html$/ } }
  }
});
```

If `a.html` links to `b.html`, and `b.html` links to `c.html`
(using `<a href="...">`), all three assets will be in the graph
after `assetGraph.populate` is done. If `c.html` happens to link
to `d.html`, `d.html` won't be added.

## assetGraph.prettyPrintAssets([queryObj])

Pretty-print all assets in the graph, or those specified by
`queryObj`. Only has an effect for asset types that support pretty
printing (`JavaScript`, `Css`, `Html`, `Xml`, and `Json`).

The asset gets marked as pretty printed (`isPretty` is set to
`true`), which doesn't affect the in-memory representation
(`asset.parseTree`), but is honored when the asset is
serialized. For `Xml`, and `Html`, however, the existing
whitespace-only text nodes in the document are removed immediately.

Compare to `assetGraph.minifyAssets`.

Example:

```javascript
// Pretty-print all Html and Css assets:
await assetGraph.prettyPrintAssets({ type: { $in: ['Html', 'Css'] } });
```

## assetGraph.removeRelations([queryObj, [options]])

Remove all relations in the graph, or those specified by `queryObj`.

The `options` object can contain these properties:

#### `detach`: Boolean

Whether to also detach the relations (remove their nodes from the
parse tree of the source asset). Only supported for some relation
types. Defaults to `false`.

#### `removeOrphan`: Boolean

Whether to also remove assets that become "orphans" as a result of
removing their last incoming relation.

## assetGraph.setHtmlImageDimensions([queryObj])

Sets the `width` and `height` attributes of the `img` elements
underlying all `HtmlImage` relations, or those matching
`queryObj`. Only works when the image pointed to by the relation is
in the graph.

Example:

```javascript
const AssetGraph = require('assetgraph');

const assetGraph = new AssetGraph();
await assetGraph.loadAssets('hasanimage.html');
await assetGraph.populate();

// assetGraph.findAssets({type: 'Html'})[0].text === '<body><img src="foo.png"></body>'

await assetGraph.setHtmlImageDimensions();

// assetGraph.findAssets({type: 'Html'})[0].text === '<body><img src="foo.png" width="29" height="32"></body>'
```

## assetGraph.writeStatsToStderr([queryObj])

Dumps an ASCII table with some basic stats about all the assets in the
graph (or those matching `queryObj`) in their current state.

Example:

```
       Ico   1   1.1 KB
       Png  28 196.8 KB
       Gif 145 129.4 KB
      Json   2  60.1 KB
       Css   2 412.6 KB
JavaScript  34   1.5 MB
      Html   1   1.3 KB
    Total: 213   2.2 MB
```

## assetGraph.writeAssetsToDisc(queryObj, outRoot[, root])

Writes the assets matching `queryObj` to disc. The `outRoot`
parameter must be a `file://` url specifying the directory where the
files should be output. The optional `root` parameter specifies the
url that you want to correspond to the `outRoot` directory (defaults
to the `root` property of the AssetGraph instance).

Directories will be created as needed.

Example:

```javascript
const AssetGraph = require('assetgraph');

const assetGraph = new AssetGraph({root: 'http://example.com/'});
await assetGraph.loadAssets(
  'http://example.com/bar/quux/foo.html',
  'http://example.com/bar/baz.html'
);

// Write the two assets to /my/output/dir/quux/foo.html and /my/output/dir/baz.html:
await assetGraph.writeAssetsToDisc({type: 'Html'} 'file:///my/output/dir/', 'http://example.com/bar/');
```

## assetGraph.writeAssetsToStdout([queryObj])

Writes all assets in the graph (or those specified by `queryObj`) to
stdout. Mostly useful for piping out a single asset.

## License

AssetGraph is licensed under a standard 3-clause BSD license -- see the
`LICENSE`-file for details.
