AssetGraph
==========

AssetGraph is an extensible, `node.js <http://nodejs.org/>`_-based
framework for manipulating and optimizing web pages and web
applications. It's the core of the third generation of the production
builder tool we are using at One.com for some of our web apps. It's in
a somewhat usable early alpha state, but still likely to undergo
massive changes.

Check out `the slides from a presentation of AssetGraph
<http://gofish.dk/assetgraph.pdf>`_ held at `the Öresund JavaScript Meetup
<http://www.meetup.com/The-Oresund-JavaScript-Meetup/>`_ on June 16th,
2011.

The complete AssetGraph-based build system mentioned in the slides can
be found `here <https://github.com/One-com/assetgraph-builder>`_.

Currently AssetGraph does the following:

* Build an asset graph programmatically or load it from disk or a
  remote server via http.
* Find explicit dependencies between JavaScript and CSS roll them out
  as ``<script>`` and ``<link rel='stylesheet'>`` tags in your
  HTML. For now only a homegrown one.include syntax is supported, but
  the parsing phase can be adapted to almost any syntax.
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

Basic usage
===========

Creating an AssetGraph object::

    var AssetGraph = require('assetgraph'),
        ag = new AssetGraph(options);

Currently the only supported option is `root`, which specifies the
root url of the graph. It is required for AssetGraph to be able to
resolve root-relative urls in assets loaded from disc. It can be
specified either as a fully qualified url or a (optionally relative)
file system path, and it defaults to the current directory. The
AssetGraph constructor normalizes the root to an absolute url ending
in a slash and makes it available as the `root` property of the
AssetGraph instance.

Example usage::

    console.log(new AssetGraph().root); // 'file:///current/working/dir/'

    var ag = new AssetGraph({root: '/home/thatguy/my/project'});
    console.log(ag.root); // 'file:///home/thatguy/my/project/'

    // When the graph is populated, root-relative urls in relations will be resolved relative to this url,
    // e.g. /foo/bar.png => file:///home/thatguy/my/project/foo/bar.png


Assets
------

An asset object represents a single node in an AssetGraph, but can be
used and manipulated on its own outside the graph context. It can even
be present in multiple AssetGraphs at once.

Most of the time it's unnecessary to create asset objects
directly. When you need to manipulate assets that already exist on
disc or on a web server, the `loadAssets` and `populate` transforms
are the easiest way to get the objects created. See the section about
transforms below.


asset.getRawSrc(cb)
-------------------

Get a Buffer object representing the undecoded source of the asset.

The method is asynchronous; you must provide a callback which is to be
called like this (standard node style): `cb(err, rawSrc)`.


asset.getText(cb)
-----------------

Only supported for text-based assets (subclasses of `assets.Text`)
such as `assets.Html`, `assets.JavaScript`, and `assets.Css`.

Get a JavaScript string with the decoded text contents of the
asset. Unlike browsers AssetGraph doesn't try to sniff the charset of
your text-based assets. It will fall back to assuming utf-8 if it's
unable to determine the encoding/charset from HTTP headers, `<meta
http-equiv='Content-Type'>` tags (Html), `@charset` (Css), so if for
some reason you're not using utf-8 for all your text-based assets,
make sure to provide those hints. Other asset types provide no
standard way to specify the charset within the file itself, so
presently there's no way to load JavaScript from disc if it's not
utf-8 or ASCII.

The method is asynchronous; you must provide a callback which is to be
called like this (standard node style): `cb(err, text)`.


asset.getParseTree(cb)
----------------------

Some asset classes support inspection and manipulation using a high
level interface. When you're done modifying the parse tree, remember
to tell the AssetGraph instance that the asset is now dirty by calling
`asset.markDirty()`.

These are the formats you'll get back:

`assets.Html` and `assets.Xml`
  `jsdom <https://github.com/tmpvar/jsdom>`_ document object.

`assets.Css`
  `CSSOM <https://github.com/NV/CSSOM>`_ CSSStyleSheet object.

`assets.JavaScript`
  `UglifyJS <https://github.com/mishoo/UglifyJS>`_ AST object.

`assets.Json`
  Regular JavaScript object (the result of JSON.parse on the decoded source).

`assets.CacheManifest`
  A JavaScript object with a key for each section present in the
  manifest (`CACHE`, `NETWORK`, `REMOTE`). The value is an array with
  an item for each entry in the section. Refer to the source for
  details.

The method is asynchronous; you must provide a callback which is to be
called like this (standard node style): `cb(err, parseTree)`.


asset.markDirty()
-----------------

Sets the `dirty` flag of the asset, which is the way to say that the
asset has been manipulated since it was first loaded (read from disc
or loaded via http). For inline assets the flag is set if the asset
has been manipulated since it was last synchronized with (copied into)
its containing asset.


Querying the graph
------------------

AssetGraph supports a flexible syntax for finding assets and relations
in a populated graph using the `findAssets` and `findRelations`
methods. Both methods take a query object as the first argument. Some
basic examples::

    // Get an array containing all assets in the graph:
    var allAssets = assetGraph.findAssets();

    // Find assets by type:
    var htmlAssets = assetGraph.findAssets({type: 'Html'});

    // Find assets by matching a regular expression against the url:
    var localImageAssets = assetGraph.findAssets({url: /^file:.*\.(?:png|gif|jpg)$/});

    // Find assets by predicate function:
    var orphanedJavaScriptAssets = assetGraph.findAssets(function (asset) {
        return asset.type === 'JavaScript' && assetGraph.findRelations({to: asset}).length === 0;
    });

    // Find all HtmlScript (<script src=...> and inline <script>) relations:
    var allHtmlScriptRelations = assetGraph.findRelations({type: 'HtmlScript'});

Query objects have "and" semantics, so all conditions must be met for
a multi-criteria query to match::

    var textBasedAssetsOnGoogleCom = assetGraph.findAssets({
        isText: true,
        url: /^https?:\/\/(?:www\.)google\.com\//
    });

    // Find assets by existence of incoming relations (experimental feature):
    var importedCssAssets = assetGraph.findAssets({type: 'Css', incoming: {type: 'CssImport'}})

Relation queries can contain nested asset queries when querying the
`to` and `from` properties::

    // Find all HtmlAnchor (<a href=...>) relations pointing at local images:
    assetGraph.findRelations({
        type: 'HtmlAnchor',
        to: {isImage: true, url: /^file:/}
    });


Transforms and workflows
========================

TODO. Look in the `examples` folder for now.


License
-------

AssetGraph is licensed under a standard 3-clause BSD license -- see the
``LICENSE``-file for details.
