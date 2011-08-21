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

TODO. Look in the `examples` folder for now.


License
-------

AssetGraph is licensed under a standard 3-clause BSD license -- see the
``LICENSE``-file for details.
