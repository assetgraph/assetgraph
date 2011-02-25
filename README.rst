AssetGraph
==========

AssetGraph is an extensible framework for optimizing web pages and web
applications. It represents the third generation of the production
builder tool we are using at One.com for some of our web apps. It's in
a somewhat usable early alpha state, but still likely to undergo
massive changes.

Currently it does the following:

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
* Optimize CSS background images by creating sprite images. The
  spriting is guided by a set of custom CSS properties with a
  ``-one-sprite`` prefix.
* Help getting your static assets on a CDN by allowing you to easily
  rewrite all references to them.
* Use Graphviz to visualize your dependencies at any step.

Design
======

The observation that inspired the project is that most of the above
optimizations are easily expressed in terms of graph manipulations,
where the nodes are the assets (HTML, CSS, images, JavaScript...) and
the edges are the relations between them, e.g. anchor tags, image
tags, favorite icons, css background-image properties and so on.

Asset Graph provides a basic data model that allows you to populate,
query, and manipulate the graph at a high level of
abstraction. Additionally, each individual asset can be inspected and
massaged using a relevant API: DOM for HTML (using `jsdom
<https://github.com/tmpvar/jsdom>`_), CSSOM for CSS (using `NV's CSSOM
module <https://github.com/NV/CSSOM>`_), and an abstract syntax tree
for JavaScript (powered by `UglifyJS
<https://github.com/mishoo/UglifyJS/>`_' parser).

Building
--------

Most of the project's dependencies are noted in the ``package.json``-file, and
they can be automatically installed with ``npm install`` or ``npm link``.

Of particular note, `node-canvas <https://github.com/learnboost/node-canvas>`_
is not a pure-node module and requires the Cairo development sources version
1.10 or later (`libcairo2-dev` on Ubuntu & friends) and compilation of some
glue C++-code to work.

Likewise, ``pngquant`` is required to help squash PNG files in size.

Testing
-------

To check if everything works, run `vows <http://vowsjs.org/>`_ in the base
directory.

Usage
-----

TODO... For now, have a look at ``buildDevelopment`` and
``buildProduction`` in the ``bin`` folder.

License
-------

AssetGraph is licensed under a standard 3-clause BSD license -- see the
``LICENSE``-file for details.

