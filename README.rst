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
in a populated graph using the ``findAssets`` and ``findRelations``
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
``to`` and ``from`` properties.

Find all HtmlAnchor (<a href=...>) relations pointing at local images::

    assetGraph.findRelations({
        type: 'HtmlAnchor',
        to: {isImage: true, url: /^file:/}
    });


Transforms and workflows
========================

AssetGraph comes with a collection of premade "transforms" that you
can use as high level building blocks when putting together your build
procedure. Most transforms work on a set of assets or relations and
usually accept a query object so they can be scoped to work on only a
specific subset of the graph.

Usually you'll start by loading some initial assets from disc or via
http using the ``loadAssets`` transform, then get the related assets
added using the ``populate`` transform, then do the actual
processing. Eventually you'll probably write the resulting assets back
to disc.

Thus the skeleton looks something like this::

    var AssetGraph = require('assetgraph'),
        transforms = AssetGraph.transforms;

    new AssetGraph({root: '/the/root/directory/'}).queue(
        transforms.loadAssets('*.html'), // Load all Html assets in the root dir
        transforms.populate({followRelations: {type: 'HtmlAnchor'}}), // Follow <a href=...>
        // More work...
        transforms.writeAssetsToDisc({type: 'Html'}) // Overwrite existing files
    ).run(finishedCallback);

In the following sections the built-in transforms are documented
individually:


transforms.addCacheManifest([queryObj])
---------------------------------------

Add a ``CacheManifest`` asset to each ``Html`` asset in the graph (or
to all ``Html`` assets matched by ``queryObj`` if provided). The cache
manifests will contain relations to all assets reachable by traversing
the graph through relations other than ``HtmlAnchor``.


transforms.bundleAssets({type: 'Css'|'JavaScript', incoming: {type: ...}}[, strategyName])
------------------------------------------------------------------------------------------

Bundle ``Css`` or ``JavaScript`` assets. At the very minimum the query
object must specify both the type of asset to bundle and the type of
the including relations (``HtmlStyle`` or ``HtmlScript``), but can
include additional criteria.

The ``strategyName`` (string) parameter can be either:

``oneBundlePerIncludingAsset`` (the default)
  Each unique asset pointing to one or more of the assets being
  bundled will get its own bundle. This can lead to duplication if
  eg. several ``Html`` assets point to the same sets of assets, but
  guarantees that the number of http requests is kept low.

``sharedBundles``
  Create as many bundles as needed, optimizing for combined byte size
  of the bundles rather than http requests. Warning: Not as well
  tested as ``oneBundlePerIncludingAsset``.

Note that a conditional comment within an ``Html`` asset conveniently
counts as a separate including asset, so in the below example
``ie.css`` and ``all.css`` won't be bundled together:

    <![if IE]><link rel='stylesheet' href='ie.css'><![endif]-->
    <link rel='stylesheet' href='all.css'>

The created bundles will be placed at the root of the asset graph with
names derived from their unique id (for example
``file://root/of/graph/124.css``) and will replace the original
assets.


transforms.compileCoffeeScriptToJavaScript([queryObj])
------------------------------------------------------

Finds all ``CoffeeScript`` assets in the graph (or those specified by
``queryObj``), compiles them to ``JavaScript`` assets and replaces the
originals.


transforms.compressJavaScript([queryObj[, compressorName[, compressorOptions]]])
--------------------------------------------------------------------------------

Compresses all ``JavaScript`` assets in the graph (or those specified by
``queryObj``).

The ``compressorName`` (string) parameter can be either:

``uglify`` (the default and the fastest)
  The excellent `UglifyJS <https://github.com/mishoo/UglifyJS>`_
  compressor.  If provided, the ``compressorOptions`` object will be
  passed to UglifyJS' ``ast_squeeze`` command.

``yuicompressor``
  Yahoo's YUICompressor though Tim-Smart's `node-yuicompressor module
  <https://github.com/Tim-Smart/node-yui-compressor>`_.  If provided,
  the ``compressorOptions`` object will be passed as the second
  argument to ``require('yui-compressor').compile``.

``closurecompiler``
  Google's Closure Compiler through Tim-Smart's `node-closure module
  <https://github.com/Tim-Smart/node-closure>`_.  If provided, the
  ``compressorOptions`` object will be passed as the second argument
  to ``require('closure-compiler').compile``.


transforms.convertCssImportsToHtmlStyles([queryObj])
----------------------------------------------------

Finds all ``Html`` assets in the graph (or those specified by
``queryObj``), finds all ``CssImport`` relations (``@import
url(...)``) in inline and external CSS and converts them to
``HtmlStyle`` relations directly from the Html document.

Effectively the inverse of ``transforms.convertHtmlStylesToInlineCssImports``.

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

Finds all ``Html`` assets in the graph (or those specified by
``queryObj``), finds all outgoing, non-inline ``HtmlStyle`` relations
(``<link rel='stylesheet' href='...'>``) and turns them into groups of
``CssImport`` relations (``@import url(...)``) in inline
stylesheets. A maximum of 31 ``CssImports`` will be created per inline
stylesheet.

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

Uses the Graphviz ``dot`` command through `node-graphviz
<https://github.com/glejeune/node-graphviz>`_ to render the current
contents of the graph and writes the result to ``fileName``. The image
format is automatically derived from the extension and can be any of
`these <http://www.graphviz.org/doc/info/output.html>`_. Using
``.svg`` is recommended.

Requires Graphviz to be installed, ``sudo apt-get install graphviz`` on
Debian/Ubuntu.


transforms.executeJavaScriptInOrder(queryObj[, context])
----------------------------------------------------------

Experimental: For each asset matched by (or those matched by
queryObj), find all reachable ``JavaScript`` assets and execute them
in order.

If the ``context`` parameter is specified, it will be used as `the
execution context
<http://nodejs.org/docs/latest/api/vm.html#vm.runInContext>`_. Otherwise
a new context will be created using `vm.createContext
<http://nodejs.org/docs/latest/api/vm.html#vm.createContext>`.


transforms.externalizeRelations([queryObj])
-------------------------------------------

Finds all inline relations in the graph (or those matched by
``queryObj``) and makes them external. The file names will be derived
from the unique ids of the assets.

For example::

     <script>foo = 'bar';</script>
     <style type='text/css'>body {color: maroon;}</style>

could be turned into::

     <script src='4.js'></script>
     <link rel='stylesheet' href='5.css'>


transforms.flattenStaticIncludes(queryObj)
------------------------------------------

Finds all ``Html`` assets in the graph (or those matched by
``queryObj``), finds all ``JavaScript`` and ``Css`` assets reachable
through ``HtmlScript``, ``HtmlStyle``, ``JavaScriptOneInclude``, and
``JavaScriptExtJsRequire`` relations and rolls them out as plain
``HtmlScript`` (``<script src='...'>``) and ``HtmlStyle`` (``<link
rel='stylesheet' href='...'>``) relations.

If your project uses deeply nested ``one.include`` statements, this
transform allows you to create a "development version" that works in a
browser. Refer to `the buildDevelopment script from AssetGraph-builder
<https://github.com/One-com/assetgraph-builder/blob/master/bin/buildDevelopment>`_.

For example::

    <head></head>
    <body>
        <script>one.include('foo.js');</script>
    </body>

where ``foo.js`` contains::

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

Finds all ``Html`` assets in the graph (or those matched by
``queryObj``), finds all directly reachable ``Css`` assets, and
converts the outgoing ``CssImage`` relations (``background-image``
etc.) to ``data:`` urls, subject to these criteria:

1) If ``sizeThreshold`` is specified, images with a greater byte size
won't be inlined.

2) To avoid duplication, images referenced by more than one
``CssImage`` relation won't be inlined.

If any image is inlined an Internet Explorer-only version of the
stylesheet will be created and referenced from the ``Html`` asset in a
conditional comment.

For example::

    assetGraph.runTransform(transforms.inlineCssImagesWithLegacyFallback(), cb);

where ``assetGraph`` contains an Html asset with this fragment::

    <link rel='stylesheet' href='foo.css'>

and ``foo.css`` contains::

    body {background-image: url(small.png);}

will be turned into::

    <!--[if IE]><link rel="stylesheet" href="foo.css"><![endif]-->
    <!--[if !IE]>--><link rel="stylesheet" href="1234.css"><!--<![endif]-->

where ``1234.css`` is a copy of the original ``foo.css`` with the
images inlined as ``data:`` urls::

    body {background-image: url(data;image/png;base64,iVBORw0KGgoAAAANSUhE...)}

The file name ``1234.css`` is just an example. The actual asset file
name will be derived from the unique id of the copy and be placed at
the root of the assetgraph.


transforms.inlineRelations([queryObj])
--------------------------------------

Inlines all relations in the graph (or those matched by
``queryObj``). Only works on relation types that support inlining, for
example ``HtmlScript``, ``HtmlStyle``, and ``CssImage``.

Example::

    assetGraph.runTransform(transforms.inlineRelations({type: ['HtmlStyle', 'CssImage']}));

where ``assetGraph`` contains an Html asset with this fragment::

    <link rel='stylesheet' href='foo.css'>

and foo.css contains::

    body {background-image: url(small.png);}

will be turned into::

    <style type='text/css'>body {background-image: url(data;image/png;base64,iVBORw0KGgoAAAANSUhE...)}</style>

Note that ``foo.css`` and the ``CssImage`` will still be modelled as
separate assets after being inlined, so they can be manipulated the
same way as when they were external.


transforms.loadAssets(fileName|wildcard|url|Asset[, ...])
----------------------------------

Add new assets to the graph and make sure they are loaded. Several
syntaxes are supported, for example::

    transforms.loadAssets('a.html', 'b.css') // Relative to assetGraph.root
    transforms.loadAssets(new AssetGraph.assets.JavaScript({
        url: "http://example.com/index.html",
        text: "var foo = bar;" // The source is specified, won't be loaded
    });

``file://`` urls support wildcard expansion::

    transforms.loadAssets('file:///foo/bar/*.html') // Wildcard expansion
    transforms.loadAssets('*.html') // assetGraph.root must be file://...


transforms.mergeIdenticalAssets([queryObj])
-------------------------------------------

Compute the MD5 sum of every asset in the graph (or those specified by
``queryObj`` and remove duplicates. The relations pointing at the
removed assets are updated to point at the copy that is kept.

For example::

    assetGraph.runTransform(transforms.mergeIdenticalAssets(), cb);

where ``assetGraph`` contains an ``Html`` asset with this fragment::

    <head>
        <style type='text/css'>body {background-image: url(foo.png);}</style>
    </head>
    <body>
        <img src='bar.png'>
    </body>

will be turned into the following if ``foo.png`` and ``bar.png`` are identical::

    <head>
        <style type='text/css'>body {background-image: url(foo.png);}</style>
    </head>
    <body>
        <img src='foo.png'>
    </body>

and the ``bar.png`` asset will be removed from the graph.


transforms.minifyAssets([queryObj])
-----------------------------------

Minify all assets in the graph, or those specified by
``queryObj``. Only has an effect for asset types that support
minification, and what actually happens also varies:

``Html`` and ``Xml``:
  Pure-whitespace text nodes are removed immediately.

``Json``, ``JavaScript``, and ``Css``:
  The asset gets marked as minified (``isPretty`` is set to
  ``false``), which doesn't affect the in-memory representation
  (``asset.parseTree``), but is honored when the asset is serialized.
  For ``JavaScript`` this only governs the amount of whitespace
  (UglifyJS' ``beautify`` parameter); for how to apply variable
  renaming and other compression techniques see
  ``transforms.compressJavaScript``.


transforms.moveAssets(queryObj, newUrlFunctionOrString)
-------------------------------------------------------

Change the url of all assets matching ``queryObj``. If the second
argument is a function, it will be called with each asset as the first
argument and the assetGraph instance as the second and the url of the
asset will be changed according to the return value:

* If a falsy value is returned, nothing happens; the asset keeps its
  current url.
* If a non-absolute url is returned, it is resolved from
  ``assetGraph.root``.
* If the url ends in a slash, the file name part of the old url is
  appended.

Move all ``Css`` and ``Png`` assets to a root-relative url::

    transforms.moveAssets({type: 'Css'}, '/images/')

If the graph contains ``http://example.com/foo/bar.css`` and
``assetGraph.root`` is ``file:///my/local/dir/``, the resulting url will
be ``file:///my/local/dir/images/bar.css``.

Move all non-inline ``JavaScript`` and ``Css`` assets to either
``http://example.com/js/`` or ``http://example.com/css/``, preserving
the current file name part of their url:

   transforms.moveAssets({type: ['JavaScript', 'Css'], isInline: false}, function (asset, assetGraph) {
       return "http://example.com/" + asset.type.toLowerCase() + "/" + asset.fileName;
   });

The assets are moved in no particular order. Compare with
``transforms.moveAssetsInOrder``.


transforms.moveAssetsInOrder(queryObj, newUrlFunctionOrString)
--------------------------------------------------------------

Does the same as ``transforms.moveAssets``, but makes sure that the
"leaf assets" are moved before the assets that have outgoing relations
to them.

The typical use case for this is when you want to rename assets to
``<hashOfContents>.<extension>`` while making sure that the hashes of
the assets that have already been moved don't change as a result of
updating the urls of the related assets after the fact.

Here's a simplified example taken from ``buildProduction`` in
`assetgraph-builder <http://github.com/One-com/assetgraph-builder>`_

    transforms.moveAssetsInOrder({type: ['JavaScript', 'Css', 'Jpeg', 'Gif', 'Png']}, function (asset) {
        return '/static/' + asset.md5Hex.substr(0, 10) + asset.extension;
    })

If a graph contains an ``Html`` asset with a relation to a ``Css`` asset
that again has a relation to a ``Png`` asset, the above snippet will
always move the ``Png`` asset before the ``Css`` asset, thus making it
safe to compute the md5 of the respective assets when the function is
invoked.

Obviously this only works for graphs (or subsets of graphs)
that don't contain cycles, and if that's not the case, an error will
be thrown.


transforms.parallel(transform1, transform2[, ...])
-------------------------------------------

Executes two or more transforms in parallel. This is only relevant for
async transforms that perform I/O. It is the obligation of the caller
to make sure that the transforms don't interfere with each other.

Example::

    transforms.parallel(
        transform.writeAssetsToDisc({url: /^file:/}, "outputDirForFileUrl/"),
        transform.writeAssetsToDisc({url: /^http:\/\/example\.com\/, "outputDirForExampleCom/"})
    )

transforms.populate
-------------------

transforms.postProcessBackgroundImages
--------------------------------------

transforms.prettyPrintAssets(queryObj)
--------------------------------------

The inverse of ``transforms.minifyAssets``.


transforms.removeAssets
-----------------------

transforms.removeRelations
--------------------------

transforms.setAssetContentType
------------------------------

transforms.setAssetEncoding
---------------------------

transforms.setAssetExtension
----------------------------

transforms.setHtmlImageDimensions
---------------------------------

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
