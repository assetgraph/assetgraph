AssetGraph
==========

AssetGraph is an extensible framework for optimizing web pages and web
applications. It represents the third generation of the production
builder tool we are using at One.com for some of our web apps. It's in
a somewhat usable early alpha state, but still likely to undergo
massive changes.

Currently it does the following:

* Build the asset graph programmatically or load it from disk or via
  http.
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
* Use Graphviz to visualize your dependencies at any optimization step.

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
<https://github.com/tmpvar/jsdom>`), CSSOM for CSS (using `NV's CSSOM
module <https://github.com/NV/CSSOM>`), and an abstract syntax tree
for JavaScript (powered by `UglifyJS
<https://github.com/mishoo/UglifyJS/>`' parser).

Building
--------

Most of the projects dependencies are noted in the ``package.json``-file, and
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
``buildProduction`` in the ``lib`` folder.

License
-------

AssetGraph is licensed under a standard 3-clause BSD license.

Copyright (c) 2011, One.com
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

  * Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in
    the documentation and/or other materials provided with the
    distribution.
  * Neither the name of the author nor the names of contributors may
    be used to endorse or promote products derived from this
    software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
