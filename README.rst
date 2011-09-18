AssetGraph
==========

AssetGraph is an extensible, `node.js <http://nodejs.org/>`_-based
framework for manipulating and optimizing web pages and web
applications. It's the core of the third generation of the production
builder tool we are using at One.com for some of our web apps. It's in
a working state, but as indicated by the pre-1.0.0 version number,
still likely to undergo changes.

Check out `the slides from a presentation of AssetGraph
<http://gofish.dk/assetgraph.pdf>`_ held at `the Öresund JavaScript Meetup
<http://www.meetup.com/The-Oresund-JavaScript-Meetup/>`_ on June 16th,
2011.

The complete AssetGraph-based build system mentioned in the slides can
be found `here <https://github.com/One-com/assetgraph-builder>`_.


Features
========

* Build an asset graph programmatically or load it from disk or a
  remote server via http.
* Find explicit dependencies between JavaScript and CSS roll them out
  as ``<script>`` and ``<link rel='stylesheet'>`` tags in your
  HTML. For now only the ExtJS 4 syntax and a homegrown `one.include`
  syntax are supported, but the parsing phase can be adapted to almost
  any syntax. More script loaders will be added later.
* Bundle and inline CSS and JavaScript.
* Create a cache manifest with references to all the assets your web
  app needs to be usable offline.
* Move all CSS, JavaScript, image assets etc. to a static dir and
  rename them to md5.extension so the web server can be configured to
  set a far-future Cache-Control.
* Help getting your static assets on a CDN by allowing you to easily
  rewrite all references to them.
* Use Graphviz to visualize your dependencies at any step.
* Using the separate `assetgraph-sprite transform
  <https://github.com/One-com/assetgraph-sprite>`_: Optimize CSS
  background images by creating sprite images. The spriting is guided
  by a set of custom CSS properties with a ``-one-sprite`` prefix.

The observation that inspired the project is that most of the above
optimizations are easily expressed in terms of graph manipulations,
where the nodes are the assets (HTML, CSS, images, JavaScript...) and
the edges are the relations between them, e.g. anchor tags, image
tags, favorite icons, css background-image properties and so on.

AssetGraph provides a basic data model that allows you to populate,
query, and manipulate the graph at a high level of
abstraction. Additionally, each individual asset can be inspected and
massaged using a relevant API: DOM for HTML (using `jsdom
<https://github.com/tmpvar/jsdom>`_), CSSOM for CSS (using `NV's CSSOM
module <https://github.com/NV/CSSOM>`_), and an abstract syntax tree
for JavaScript (powered by `UglifyJS
<https://github.com/mishoo/UglifyJS/>`_' parser).

Installation
============

Make sure you have node.js and `npm <http://npmjs.org/>`_ installed,
then run::

    $ npm install assetgraph


API documentation
=================

A work in progress. Look `here <http://gofish.dk/assetgraph/api.html>`_.


Querying the graph
------------------

AssetGraph supports a flexible syntax for finding assets and relations
in a populated graph using the `findAssets` and `findRelations`
methods. Both methods take a query object as the first argument. Below
are some basic examples.

Get an array containing all assets in the graph::

    var allAssets = assetGraph.findAssets();

Find assets by type::

    var htmlAssets = assetGraph.findAssets({type: 'Html'});

Find assets by matching a regular expression against the url::

    var localImageAssets = assetGraph.findAssets({url: /^file:.*\.(?:png|gif|jpg)$/});

Find assets by predicate function::

    var orphanedJavaScriptAssets = assetGraph.findAssets(function (asset) {
        return asset.type === 'JavaScript' && assetGraph.findRelations({to: asset}).length === 0;
    });

Find all HtmlScript (<script src=...> and inline <script>) relations::

    var allHtmlScriptRelations = assetGraph.findRelations({type: 'HtmlScript'});

Query objects have "and" semantics, so all conditions must be met for
a multi-criteria query to match::

    var textBasedAssetsOnGoogleCom = assetGraph.findAssets({
        isText: true,
        url: /^https?:\/\/(?:www\.)google\.com\//
    });

Find assets by existence of incoming relations (experimental feature)::

    var importedCssAssets = assetGraph.findAssets({type: 'Css', incoming: {type: 'CssImport'}})

Relation queries can contain nested asset queries when querying the
`to` and `from` properties.

Find all HtmlAnchor (<a href=...>) relations pointing at local images::

    assetGraph.findRelations({
        type: 'HtmlAnchor',
        to: {isImage: true, url: /^file:/}
    });


Transforms and workflows
========================

AssetGraph comes with a collection of premade transforms that you can
combine into a build procedure.


transforms.addCacheManifest([queryObj])
---------------------------------------

Add a `CacheManifest` asset to each `Html` asset in the graph (or to
all `Html` assets matched by `queryObj` if provided). The cache
manifests will contain relations to all assets reachable by traversing
the graph through relations other than `HtmlAnchor`.


transforms.bundleAssets({type: 'Css'|'JavaScript', incoming: {type: ...}}[, strategyName])
------------------------------------------------------------------------------------------

Bundle `Css` or `JavaScript` assets. At the very minimum the query
object must specify both the type of asset to bundle and the type of
the including relations (`HtmlStyle` or `HtmlScript`), but can include
additional criteria.

The `strategyName` (string) parameter can be either:

``oneBundlePerIncludingAsset`` (the default)
  Each unique asset pointing to one or more of the assets being
  bundled will get its own bundle. This can lead to duplication if
  eg. several `Html` assets point to the same sets of assets, but
  guarantees that the number of http requests is kept low.

``sharedBundles``
  Create as many bundles as needed, optimizing for combined byte size
  of the bundles rather than http requests. Warning: Not as well
  tested as `oneBundlePerIncludingAsset`.

Note that a conditional comment within an `Html` asset conveniently
counts as a separate including asset, so in the below example `ie.css`
and `all.css` won't be bundled together:

    <![if IE]><link rel='stylesheet' href='ie.css'><![endif]-->
    <link rel='stylesheet' href='all.css'>

The created bundles will be placed at the root of the asset graph with
names derived from their unique id (for example
`file://root/of/graph/124.css`) and will replace the original assets.


transforms.compileCoffeeScriptToJavaScript([queryObj])
------------------------------------------------------

Finds all `CoffeeScript` assets in the graph (or those specified by
`queryObj`), compiles them to `JavaScript` assets and replaces the
originals.


transforms.compressJavaScript([queryObj[, compressorName[, compressorOptions]]])
--------------------------------------------------------------------------------

Compresses all `JavaScript` assets in the graph (or those specified by
`queryObj`).

The `compressorName` (string) parameter can be either:

`uglify` (the default and the fastest)
  The excellent `UglifyJS <https://github.com/mishoo/UglifyJS>`_ compressor.
  If provided, the `compressorOptions` object will be passed to UglifyJS' `ast_squeeze` command.

`yuicompressor`
  Yahoo's YUICompressor though Tim-Smart's `node-yuicompressor module <https://github.com/Tim-Smart/node-yui-compressor>`_.
  If provided, the `compressorOptions` object will be passed as the second argument to `require('yui-compressor').compile`.

`closurecompiler`
  Google's Closure Compiler through Tim-Smart's `node-closure module <https://github.com/Tim-Smart/node-closure>`_.
  If provided, the `compressorOptions` object will be passed as the second argument to `require('closure-compiler').compile`.


transforms.convertCssImportsToHtmlStyles([queryObj])
----------------------------------------------------

Finds all `Html` assets in the graph (or those specified by
`queryObj`), finds all `CssImport` relations (`@import url(...)`) in
inline and external CSS and converts them to `HtmlStyle` relations
directly from the Html document.

Effectively the inverse of `transforms.convertHtmlStylesToInlineCssImports`.

Example::

    <style type='text/css'>
        @import url(print.css) print;
        @import url(foo.css);
        body {color: red;}
    </style>

is turned into::

   <link rel='stylesheet' href='print.css' media='print'>
   <link rel='stylesheet' href='foo.css'>
   <style type='text/css'>
       body {color: red;}
   </style>


transforms.convertHtmlStylesToInlineCssImports([queryObj])
----------------------------------------------------------

Finds all `Html` assets in the graph (or those specified by
`queryObj`), finds all outgoing, non-inline `HtmlStyle` relations
(`<link rel='stylesheet' href='...'>`) and turns them into groups of
`CssImport` relations (`@import url(...)`) in inline stylesheets. A
maximum of 31 `CssImports` will be created per inline stylesheet.

Example::

     <link rel='stylesheet' href='foo.css'>
     <link rel='stylesheet' href='bar.css'>

is turned into::

     <style type='text/css'>
         @import url(foo.css);
         @import url(bar.css);
     </style>

This is a workaround for `the limit of 31 stylesheets in Internet
Explorer <= 8 <http://social.msdn.microsoft.com/Forums/en-US/iewebdevelopment/thread/ad1b6e88-bbfa-4cc4-9e95-3889b82a7c1d/>`_.
This transform allows you to have up to 31*31 stylesheets in the
development version of your HTML and still have it work in older
Internet Explorer versions.


transforms.drawGraph(fileName)
------------------------------

Uses the Graphviz `dot` command through `node-graphviz
<https://github.com/glejeune/node-graphviz>`_ to render the current
contents of the graph and writes the result to `fileName`. The image
format is automatically derived from the extension and can be any of
`these <http://www.graphviz.org/doc/info/output.html>`_. Using `.svg`
is recommended.

Requires Graphviz to be installed, `sudo apt-get install graphviz` on
Debian/Ubuntu.


transforms.executeJavaScriptInOrder(queryObj[, context])
----------------------------------------------------------

Experimental: For each asset matched by (or those matched by
queryObj), find all reachable `JavaScript` assets and execute them in
order.

If the `context` parameter is specified, it will be used as `the
execution context
<http://nodejs.org/docs/latest/api/vm.html#vm.runInContext>`_. Otherwise
a new context will be created using `vm.createContext
<http://nodejs.org/docs/latest/api/vm.html#vm.createContext>`.


transforms.externalizeRelations([queryObj])
-------------------------------------------

Finds all inline relations in the graph (or those matched by
`queryObj`) and makes them external. The file names will be derived
from the unique ids of the assets.

For example::

     <script>foo = 'bar';</script>
     <style type='text/css'>body {color: maroon;}</style>

could be turned into::

     <script src='4.js'></script>
     <link rel='stylesheet' href='5.css'>


transforms.flattenStaticIncludes(queryObj)
------------------------------------------

Finds all `Html` assets in the graph (or those matched by `queryObj`),
finds all `JavaScript` and `Css` assets reachable through
`HtmlScript`, `HtmlStyle`, `JavaScriptOneInclude`, and
`JavaScriptExtJsRequire` relations and rolls them out as plain
`HtmlScript` (`<script src='...'>`) and `HtmlStyle` (`<link
rel='stylesheet' href='...'>`) relations.

If your project uses deeply nested `one.include` statements, this
transform allows you to create a "development version" that works in a
browser. Refer to `the buildDevelopment script from AssetGraph-builder
<https://github.com/One-com/assetgraph-builder/blob/master/bin/buildDevelopment>`_.

For example::

    <head></head>
    <body>
        <script>one.include('foo.js');</script>
    </body>

where `foo.js` contains::

    one.include('bar.js');
    one.include('quux.css');
    var blah = 'baz';
    ...

is turned into::

    <head>
        <link rel='stylesheet' href='quux.css'>
    </head>
    <script src='bar.js'></script>
    <script src='foo.js'></script>


transforms.inlineCssImagesWithLegacyFallback([queryObj[, sizeThreshold]])
--------------------------------------------------------

Finds all `Html` assets in the graph (or those matched by `queryObj`),
finds all directly reachable `Css` assets, and converts the outgoing
`CssImage` relations (`background-image` etc.) to `data:` urls,
subject to these criteria:

1) If `sizeThreshold` is specified, images with a greater byte size
won't be inlined.

2) To avoid duplication, images referenced by more than one `CssImage`
relation won't be inlined.

If any image is inlined an Internet Explorer-only version of the
stylesheet will be created and referenced from the `Html` asset in a
conditional comment.

For example::

    <link rel='stylesheet' href='foo.css'>

where `foo.css` contains::

    body {background-image: url(small.png);}

is turned into::

    <!--[IE]><link rel="stylesheet" href="8.css"><![endif]-->
    <!--[if !IE]>--><link rel="stylesheet" href="foo.css"><!--<![endif]-->

where `8.css` is a copy of the original `foo.css`, and `foo.css` now contains:

    body {background-image: url(data;image/png;base64,iVBORw0KGgoAAAANSUhE...)}


transforms.inlineRelations([queryObj])
--------------------------------------

Inlines all relations in the graph (or those matched by `queryObj`).


transforms.loadAssets(fileName...)
----------------------------------

transforms.mergeIdenticalAssets([queryObj])
-------------------------------------------

transforms.minifyAssets([queryObj])
-----------------------------------

transforms.moveAssets
---------------------

transforms.moveAssetsToDirectory
--------------------------------

transforms.moveAssetsToNewRoot
------------------------------

transforms.parallel
-------------------

transforms.populate
-------------------

transforms.postProcessBackgroundImages
--------------------------------------

transforms.prettyPrintAssets
----------------------------

transforms.removeAssets
-----------------------

transforms.removeRelations
--------------------------

transforms.renameAssetsToMd5Prefix
----------------------------------

transforms.setAssetContentType
------------------------------

transforms.setAssetEncoding
---------------------------

transforms.setAssetExtension
----------------------------

transforms.startOverIfAssetSourceFilesChange
--------------------------------------------

transforms.stats
----------------

transforms.writeAssetsToDisc
----------------------------

transforms.writeAssetsToStdout
------------------------------

License
-------

AssetGraph is licensed under a standard 3-clause BSD license -- see the
``LICENSE``-file for details.
