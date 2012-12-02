AssetGraph
==========

AssetGraph is an extensible, <a href="http://nodejs.org/">node.js</a>-based
framework for manipulating and optimizing web pages and web
applications. It's the core of the third generation of the production
builder tool we are using at One.com for some of our web apps.

If you are looking for a prepackaged build system take a look at <a
href="https://github.com/One-com/assetgraph-builder">Assetgraph-builder</a>.

Check out <a href="http://gofish.dk/assetgraph.pdf">the slides from a
presentation of AssetGraph</a> held at <a
href="http://www.meetup.com/The-Oresund-JavaScript-Meetup/">the
Öresund JavaScript Meetup</a> on June 16th, 2011.

The complete AssetGraph-based build system mentioned in the slides can
be found <a href="https://github.com/One-com/assetgraph-builder">here</a>.


Assets and relations
====================

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
using a relevant API: DOM for HTML (using <a
href="https://github.com/tmpvar/jsdom">jsdom</a>, CSSOM for CSS (using
<a href="https://github.com/NV/CSSOM">NV's CSSOM module</a>, and an
abstract syntax tree for JavaScript (powered by <a
href="https://github.com/mishoo/UglifyJS/">UglifyJS</a>' parser).

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

#### HTML ####

`<a>`, `<link rel="stylesheet|shortcut icon|alternate">`, `<script>`, `<style>`,
`<html manifest="...">` `<img>`, `<video>`, `<audio>`, `<applet>`,
`<embed>`, `<esi:include>`, `<iframe>`

#### CSS ####

`background-image: url(...)`, `@import url(...)`, `behavior: url(...)`,
`filter: AlphaImageLoader(src='...')`

#### JavaScript ####

AMD/RequireJS `require` and `define`, CommonJS `require(...)`,
homegrown `INCLUDE` syntax for specifying requirements, and homegrown
`GETSTATICURL(...)` and `GETTEXT(...)` syntax for referencing external files

#### HTC ####

(same as for HTML)

#### Cache manifest ####

Entries in the `CACHE`, `NETWORK` and `FALLBACK` sections

#### JSON, XML, PNG, GIF, JPEG, ICO ####

(none)

Features
========

* Build an AssetGraph programmatically or load it from disk or a
  remote server via http.
* Find explicit dependencies between JavaScript and CSS and roll them
  out as `<script>` and `<link rel='stylesheet'>` tags in your
  HTML. For now require.js/AMD, the ExtJS 4 syntax and a homegrown
  `INCLUDE` syntax are supported, but the parsing phase can be
  adapted to almost any syntax. Support for more script loaders will
  be added on demand.
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
  href="https://github.com/One-com/assetgraph-sprite">assetgraph-sprite
  transform</a>: Optimize CSS background images by creating sprite
  images. The spriting is guided by a set of custom CSS properties
  with a `-ag-sprite` prefix.


Installation
============

Make sure you have <a href="http://nodejs.org/">node.js</a> and <a
href="http://npmjs.org/">npm</a> installed, then run:

```
$ npm install assetgraph
```

API documentation
=================

A work in progress. Look <a href="http://gofish.dk/assetgraph/api/">here</a>.


Querying the graph
------------------

AssetGraph supports a flexible syntax for finding assets and relations
in a populated graph using the `findAssets` and `findRelations`
methods. Both methods take a query object as the first argument. Below
are some basic examples.

Get an array containing all assets in the graph:

```javascript
var allAssets = assetGraph.findAssets();
```

Find assets by type:

```javascript
var htmlAssets = assetGraph.findAssets({type: 'Html'});
```

Find assets by matching a regular expression against the url:

```javascript
var localImageAssets = assetGraph.findAssets({url: /^file:.*\.(?:png|gif|jpg)$/});
```

Find assets by predicate function:

```javascript
var orphanedJavaScriptAssets = assetGraph.findAssets(function (asset) {
    return asset.type === 'JavaScript' && assetGraph.findRelations({to: asset}).length === 0;
});
```

Find all HtmlScript (`<script src=...>` and inline `<script>`) relations:

```javascript
var allHtmlScriptRelations = assetGraph.findRelations({type: 'HtmlScript'});
```

Query objects have "and" semantics, so all conditions must be met for
a multi-criteria query to match:

```javascript
var textBasedAssetsOnGoogleCom = assetGraph.findAssets({
    isText: true,
    url: /^https?:\/\/(?:www\.)google\.com\//
});
```

Find assets by existence of incoming relations (experimental feature):

```javascript
var importedCssAssets = assetGraph.findAssets({type: 'Css', incoming: {type: 'CssImport'}})
```

Relation queries can contain nested asset queries when querying the
`to` and `from` properties.

Find all HtmlAnchor (`<a href=...>`) relations pointing at local images:

```javascript
assetGraph.findRelations({
    type: 'HtmlAnchor',
    to: {isImage: true, url: /^file:/}
});
```

Transforms and workflows
========================

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

new AssetGraph({root: '/the/root/directory/'})
    .loadAssets('*.html') // Load all Html assets in the root dir
    .populate({followRelations: {type: 'HtmlAnchor'}}) // Follow <a href=...>
    // More work...
    .writeAssetsToDisc({type: 'Html'}) // Overwrite existing files
    .run(function (err, assetGraph) {
        // Done!
    });
```

In the following sections the built-in transforms are documented
individually:


assetGraph.addCacheManifest([queryObj])
---------------------------------------

Add a `CacheManifest` asset to each `Html` asset in the graph (or
to all `Html` assets matched by `queryObj` if provided). The cache
manifests will contain relations to all assets reachable by traversing
the graph through relations other than `HtmlAnchor`.


assetGraph.bundleRelations(queryObj[, strategyName])
----------------------------------------------------

Bundle the `Css` and `JavaScript` assets pointed to by the
relations matched by `queryObj`.

The `strategyName` (string) parameter can be either:

#### `oneBundlePerIncludingAsset` (the default) ####

Each unique asset pointing to one or more of the assets being
bundled will get its own bundle. This can lead to duplication if
eg. several `Html` assets point to the same sets of assets, but
guarantees that the number of http requests is kept low.

#### `sharedBundles` ####

Create as many bundles as needed, optimizing for combined byte size
of the bundles rather than http requests. Warning: Not as well
tested as `oneBundlePerIncludingAsset`.

Note that a conditional comment within an `Html` asset conveniently
counts as a separate including asset, so in the below example
`ie.css` and `all.css` won't be bundled together:

```html
<![if IE]><link rel='stylesheet' href='ie.css'><![endif]-->
<link rel='stylesheet' href='all.css'>
```

The created bundles will be placed at the root of the asset graph with
names derived from their unique id (for example
`file://root/of/graph/124.css`) and will replace the original
assets.


assetGraph.compileCoffeeScriptToJavaScript([queryObj])
------------------------------------------------------

Finds all `CoffeeScript` assets in the graph (or those specified by
`queryObj`), compiles them to `JavaScript` assets and replaces the
originals.


assetGraph.compileLessToCss([queryObj])
---------------------------------------

Finds all `Less` assets in the graph (or those specified by
`queryObj`), compiles them to `Css` assets and replaces the
originals.


assetGraph.compressJavaScript([queryObj[, compressorName[, compressorOptions]]])
--------------------------------------------------------------------------------

Compresses all `JavaScript` assets in the graph (or those specified by
`queryObj`).

The `compressorName` (string) parameter can be either:

#### `uglifyJs` (the default and the fastest) ####

The excellent <a href="https://github.com/mishoo/UglifyJS">UglifyJS</a>
compressor.  If provided, the `compressorOptions` object will be
passed to UglifyJS' `ast_squeeze` command.

#### `yuicompressor` ####

Yahoo's YUICompressor though Tim-Smart's <a
href="https://github.com/Tim-Smart/node-yui-compressor">node-yuicompressor
module</a>. If provided, the `compressorOptions` object will be
passed as the second argument to `require('yui-compressor').compile`.

#### `closurecompiler` ####

Google's Closure Compiler through Tim-Smart's <a
href="https://github.com/Tim-Smart/node-closure">node-closure
module</a>. If provided, the `compressorOptions` object will be
passed as the second argument to
`require('closure-compiler').compile`.


assetGraph.convertCssImportsToHtmlStyles([queryObj])
----------------------------------------------------

Finds all `Html` assets in the graph (or those specified by
`queryObj`), finds all `CssImport` relations (`@import
url(...)`) in inline and external CSS and converts them to
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


assetGraph.convertHtmlStylesToInlineCssImports([queryObj])
----------------------------------------------------------

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
allows you to have up to 31*31 stylesheets in the development version
of your HTML and still have it work in older Internet Explorer
versions.


assetGraph.drawGraph(fileName)
------------------------------

Uses the Graphviz `dot` command to render the current contents of the
graph and writes the result to `fileName`. The image format is
automatically derived from the extension and can be any of <a
href="http://www.graphviz.org/doc/info/output.html">these</a>. Using
`.svg` is recommended.

Requires Graphviz to be installed, `sudo apt-get install graphviz` on
Debian/Ubuntu.


assetGraph.executeJavaScriptInOrder(queryObj[, context])
--------------------------------------------------------

Experimental: For each JavaScript asset in the graph (or those matched by
queryObj), find all reachable `JavaScript` assets and execute them
in order.

If the `context` parameter is specified, it will be used as <a
href="http://nodejs.org/docs/latest/api/vm.html#vm.runInContext">the
execution context</a>. Otherwise a new context will be created using
<a
href="http://nodejs.org/docs/latest/api/vm.html#vm.createContext">vm.createContext</a>.

assetGraph.externalizeRelations([queryObj])
-------------------------------------------

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

assetGraph.flattenStaticIncludes([queryObj])
--------------------------------------------

Finds all `Html` assets in the graph (or those matched by
`queryObj`), finds all `JavaScript` and `Css` assets reachable
through `HtmlScript`, `HtmlStyle`, `JavaScriptOneInclude`, and
`JavaScriptExtJsRequire` relations and rolls them out as plain
`HtmlScript` (`<script src='...'>`) and `HtmlStyle` (`<link
rel='stylesheet' href='...'>`) relations.

If your project uses deeply nested `INCLUDE` statements, this
transform allows you to create a "development version" that works in a
browser. Refer to <a
href="https://github.com/One-com/assetgraph-builder/blob/master/bin/buildDevelopment">the
buildDevelopment script from AssetGraph-builder</a>.

For example:

```html
<head></head>
<body>
    <script>INCLUDE('foo.js');</script>
</body>
```

where `foo.js` contains:

```javascript
INCLUDE('bar.js');
INCLUDE('quux.css');
var blah = 'baz';
...
```

is turned into:

```html
<head>
    <link rel='stylesheet' href='quux.css'>
</head>
<script src='bar.js'></script>
<script src='foo.js'></script>
```

assetGraph.inlineCssImagesWithLegacyFallback([queryObj[, sizeThreshold]])
-------------------------------------------------------------------------

Finds all `Html` assets in the graph (or those matched by
`queryObj`), finds all directly reachable `Css` assets, and
converts the outgoing `CssImage` relations (`background-image`
etc.) to `data:` urls, subject to these criteria:

1) If `sizeThreshold` is specified, images with a greater byte size
won't be inlined.

2) To avoid duplication, images referenced by more than one
`CssImage` relation won't be inlined.

3) A `CssImage` relation residing in a CSS rule with a
`-ag-image-inline: true` declaration will always be inlined. This
takes precedence over the first two criteria.

If any image is inlined an Internet Explorer-only version of the
stylesheet will be created and referenced from the `Html` asset in a
conditional comment.

For example:

```javascript
assetGraph
    .inlineCssImagesWithLegacyFallback()
    .run(funtion (err, assetGraph) {...});
```

where `assetGraph` contains an Html asset with this fragment:

```html
<link rel='stylesheet' href='foo.css'>
```

and `foo.css` contains:

```css
body {background-image: url(small.png);}
```

will be turned into:

```html
<!--[if IE]><link rel="stylesheet" href="foo.css"><![endif]-->
<!--[if !IE]>--><link rel="stylesheet" href="1234.css"><!--<![endif]-->
```

where `1234.css` is a copy of the original `foo.css` with the
images inlined as `data:` urls:

```css
body {background-image: url(data;image/png;base64,iVBORw0KGgoAAAANSUhE...)}
```

The file name `1234.css` is just an example. The actual asset file
name will be derived from the unique id of the copy and be placed at
the root of the assetgraph.


assetGraph.inlineRelations([queryObj])
--------------------------------------

Inlines all relations in the graph (or those matched by
`queryObj`). Only works on relation types that support inlining, for
example `HtmlScript`, `HtmlStyle`, and `CssImage`.

Example:

```javascript
assetGraph.inlineRelations({type: ['HtmlStyle', 'CssImage']});
```

where `assetGraph` contains an Html asset with this fragment:

```html
<link rel='stylesheet' href='foo.css'>
```

and `foo.css` contains:

```css
body {background-image: url(small.png);}
```

will be turned into:

```html
<style type='text/css'>body {background-image: url(data;image/png;base64,iVBORw0KGgoAAAANSUhE...)}</style>
```

Note that `foo.css` and the `CssImage` will still be modelled as
separate assets after being inlined, so they can be manipulated the
same way as when they were external.


assetGraph.loadAssets(fileName|wildcard|url|Asset[, ...])
---------------------------------------------------------

Add new assets to the graph and make sure they are loaded. Several
syntaxes are supported, for example:

```javascript
assetGraph.loadAssets('a.html', 'b.css'); // Relative to assetGraph.root
assetGraph.loadAssets(new AssetGraph.assets.JavaScript({
    url: "http://example.com/index.html",
    text: "var foo = bar;" // The source is specified, won't be loaded
});
```

`file://` urls support wildcard expansion:

```javascript
assetGraph.loadAssets('file:///foo/bar/*.html'); // Wildcard expansion
assetGraph.loadAssets('*.html'); // assetGraph.root must be file://...
```


assetGraph.mergeIdenticalAssets([queryObj])
-------------------------------------------

Compute the MD5 sum of every asset in the graph (or those specified by
`queryObj`) and remove duplicates. The relations pointing at the
removed assets are updated to point at the copy that is kept.

For example:

```javascript
assetGraph.mergeIdenticalAssets();
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


assetGraph.minifyAssets([queryObj])
-----------------------------------

Minify all assets in the graph, or those specified by
`queryObj`. Only has an effect for asset types that support
minification, and what actually happens also varies:

#### `Html` and `Xml` ####

Pure-whitespace text nodes are removed immediately.

#### `Json`, `JavaScript`, and `Css` ####

The asset gets marked as minified (`isPretty` is set to
`false`), which doesn't affect the in-memory representation
(`asset.parseTree`), but is honored when the asset is serialized.
For `JavaScript` this only governs the amount of whitespace
(UglifyJS' `beautify` parameter); for how to apply variable
renaming and other compression techniques see
`assetGraph.compressJavaScript`.

Compare to `assetGraph.prettyPrintAssets`.


assetGraph.moveAssets(queryObj, newUrlFunctionOrString)
-------------------------------------------------------

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
assetGraph.moveAssets({type: 'Css'}, '/images/');
```

If the graph contains `http://example.com/foo/bar.css` and
`assetGraph.root` is `file:///my/local/dir/`, the resulting url will
be `file:///my/local/dir/images/bar.css`.

Move all non-inline `JavaScript` and `Css` assets to either
`http://example.com/js/` or `http://example.com/css/`, preserving
the current file name part of their url:

```javascript
assetGraph.moveAssets({type: ['JavaScript', 'Css'], isInline: false}, function (asset, assetGraph) {
    return "http://example.com/" + asset.type.toLowerCase() + "/" + asset.fileName;
});
```

The assets are moved in no particular order. Compare with
`assetGraph.moveAssetsInOrder`.


assetGraph.moveAssetsInOrder(queryObj, newUrlFunctionOrString)
--------------------------------------------------------------

Does the same as `assetGraph.moveAssets`, but makes sure that the
"leaf assets" are moved before the assets that have outgoing relations
to them.

The typical use case for this is when you want to rename assets to
`<hashOfContents>.<extension>` while making sure that the hashes of
the assets that have already been moved don't change as a result of
updating the urls of the related assets after the fact.

Here's a simplified example taken from `buildProduction` in
<a href="http://github.com/One-com/assetgraph-builder">AssetGraph-builder</a>.

```javascript
assetGraph.moveAssetsInOrder({type: ['JavaScript', 'Css', 'Jpeg', 'Gif', 'Png']}, function (asset) {
    return '/static/' + asset.md5Hex.substr(0, 10) + asset.extension;
});
```

If a graph contains an `Html` asset with a relation to a `Css` asset
that again has a relation to a `Png` asset, the above snippet will
always move the `Png` asset before the `Css` asset, thus making it
safe to compute the md5 of the respective assets when the function is
invoked.

Obviously this only works for graphs (or subsets of graphs)
that don't contain cycles, and if that's not the case, an error will
be thrown.


transforms.populate(options)
----------------------------

Add assets to the graph by recursively following "dangling
relations". This is the preferred way to load a complete web site or
web application into an `AssetGraph` instance after using
`assetGraph.loadAssets` to add one or more assets to serve as the
starting point for the population. The loading of the assets happens
in parallel.

The `options` object can contain these properties:

#### `from`: queryObj ####

Specifies the set assets of assets to start populating from
(defaults to all assets in the graph).

#### `followRelations`: queryObj ####

Limits the set of relations that are followed. The default is to
follow all relations.

#### `onError`: function (err, assetGraph, asset) ####

If there's an error loading an asset and an `onError` function is
specified, it will be called, and the population will continue. If
not specified, the population will stop and pass on the error to its
callback. (This is poorly thought out and should be removed or
redesigned).

#### `concurrency`: Number ####

The maximum number of assets that can be loading at once (defaults to 100).

Example:

```javascript
new AssetGraph()
    .addAssets('a.html')
    .populate({
        followRelations: {type: 'HtmlAnchor', to: {url: /\/[bc]\.html$/}}
    })
    .run(function (err, assetGraph) {
        // Done!
    });
```

If `a.html` links to `b.html`, and `b.html` links to `c.html`
(using `<a href="...">`), all three assets will be in the graph
after `assetGraph.populate` is done. If `c.html` happens to link
to `d.html`, `d.html` won't be added.


assetGraph.prettyPrintAssets([queryObj])
----------------------------------------

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
assetGraph.prettyPrintAssets({type: ['Html', 'Css']});
```


assetGraph.removeAssets([queryObj[, detachIncomingRelations]])
--------------------------------------------------------------

Remove all assets in the graph, or those specified by `queryObj`,
along with their incoming relations. If `detachIncomingRelations` is
set to `true`, the incoming relations will also be detached (removed
from the parse tree of the source asset). This is not supported by
all relation types.

Example:

```javascript
var AssetGraph = require('assetgraph');
new AssetGraph()
    // Add a Html asset with an inline Css asset:
    .loadAssets(new AssetGraph.assets.Html({
        text: '<html><head><style type="text/css">body {color: red;}</style></head></html>'
    }))
    // Remove the inline Css asset and detach the incoming HtmlStyle relation:
    .removeAssets({type: 'Css'}, true),
    // Now the graph only contains the Html asset (without the <style> element):
    .writeAssetsToStdout({type: 'Html'})
    // '<html><head></head></html>'
    .run(function (err, assetGraph) {
        // Done!
    });
```

assetGraph.removeRelations([queryObj, [options]])
-------------------------------------------------

Remove all relations in the graph, or those specified by `queryObj`.

The `options` object can contain these properties:

#### `detach`: Boolean ####

Whether to also detach the relations (remove their nodes from the
parse tree of the source asset). Only supported for some relation
types. Defaults to `false`.

#### `unresolved`: Boolean ####

Whether to remove unresolved relations too ("dangling" ones whose
target assets aren't in the graph). Defaults to `false`.

#### `removeOrphan`: Boolean ####

Whether to also remove assets that become "orphans" as a result of
removing their last incoming relation.


assetGraph.setAssetContentType(queryObj, contentType)
-----------------------------------------------------

Updates the `contentType` property of all assets matching
`queryObj`. After an asset is loaded, the `contentType` property
is only kept around as a handy piece of metadata, so updating it has
no side effects. It's mostly useful if want to upload a "snapshot" of
an AssetGraph to a WebDAV server or similar.


assetGraph.setAssetEncoding(queryObj, newEncoding)
--------------------------------------------------

Changes the encoding (charset) of the assets matched by `queryObj`
to `encoding` (`utf-8`, `windows-1252`, `TIS-620`, etc.).
Only works for text-based assets. Affects the `rawSrc` property of
the asset, the decoded `text` property remains unchanged.

Uses <a href="http://github.com/bnoordhuis/node-iconv">node-iconv</a>
to do the actual text conversion, so make sure the charset is
supported.

As a convenient side effect, `Html` assets with a `<head>` element
will get a `<meta http-equiv="Content-Type" content="...">` appended
specifying the new encoding. If such a `<meta>` already exists, it
will be updated.

Example:

```javascript
var AssetGraph = require('assetgraph');

new AssetGraph()
    // Add a Html asset with an inline Css asset:
    .loadAssets(new AssetGraph.assets.Html({
        text: '<html><head></head>æ</html>'
    }))
    .setAssetEncoding({type: 'Html'}, 'iso-8859-1')
    .writeAssetsToStdout({type: 'Html'})
    // <html><head></head><meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1"></head>�</html>
    .run(function (err, assetGraph) {
        // Done!
    });
```

assetGraph.setAssetExtension(queryObj, extension)
-------------------------------------------------

Changes the extension part of the urls of all non-inline assets
matching `queryObj` to `extension`. The extension should include
the leading dot like the `require('path').extname()` function.

Example:

```javascript
var AssetGraph = require('assetgraph');

new AssetGraph()
    .loadAssets('http://example.com/foo.html')
    .setAssetExtension({type: 'Html'}, '.bar')
    .run(function (err, assetGraph) {
        if (err) throw err;
        console.log(assetGraph.findAssets({type: 'Html'})[0].url); // 'http://example.com/foo.bar'
        // Done!
    });
```

assetGraph.setHtmlImageDimensions([queryObj])
---------------------------------------------

Sets the `width` and `height` attributes of the `img` elements
underlying all `HtmlImage` relations, or those matching
`queryObj`. Only works when the image pointed to by the relation is
in the graph.

Example:

```javascript
var AssetGraph = require('assetgraph');

new AssetGraph()
    .loadAssets('hasanimage.html')
    .populate()
    // assetGraph.findAssets({type: 'Html'})[0].text === '<body><img src="foo.png"></body>'
    .setHtmlImageDimensions()
    // assetGraph.findAssets({type: 'Html'})[0].text === '<body><img src="foo.png" width="29" height="32"></body>'
    .run(function (err, assetGraph) {
        // Done!
    });
```


assetGraph.startOverIfAssetSourceFilesChange([queryObj])
--------------------------------------------------------

Starts watching all non-inline `file://` assets (or those matching
`queryObj`) as they're added to the graph, and reruns all the
following transformations when a source file is changed on disc.

Used to power `buildDevelopment --watch` in <a
href="http://github.com/One-com/assetgraph-builder">AssetGraph-builder</a>.
Should be considered experimental.


assetGraph.stats([queryObj])
----------------------------

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

assetGraph.writeAssetsToDisc(queryObj, outRoot[, root])
-------------------------------------------------------

Writes the assets matching `queryObj` to disc. The `outRoot`
parameter must be a `file://` url specifying the directory where the
files should be output. The optional `root` parameter specifies the
url that you want to correspond to the `outRoot` directory (defaults
to the `root` property of the AssetGraph instance).

Directories will be created as needed.

Example:

```javascript
var AssetGraph = require('assetgraph');

new AssetGraph({root: 'http://example.com/'})
    .loadAssets('http://example.com/bar/quux/foo.html',
                'http://example.com/bar/baz.html')
    // Will write the two assets to /my/output/dir/quux/foo.html and /my/output/dir/baz.html:
    .writeAssetsToDisc({type: 'Html'} 'file:///my/output/dir/', 'http://example.com/bar/')
    .run(function (err, assetGraph) {
        // Done!
    });
```


assetGraph.writeAssetsToStdout([queryObj])
------------------------------------------

Writes all assets in the graph (or those specified by `queryObj`) to
stdout. Mostly useful for piping out a single asset.


License
-------

AssetGraph is licensed under a standard 3-clause BSD license -- see the
`LICENSE`-file for details.
