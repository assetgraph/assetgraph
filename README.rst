Asset Graph
===========

Asset Graph is a highly integrated build/compilation tool for JavaScript
projects. A dependency graph is built for all resources in the project.

 * Only the relevant parts of the sources / assets is included.
 * Images are automatically sprited (including a special version for IE6).
 * Minification of JavaScript.

Building
--------

The projects dependencies are noted in the `package.json`-file, and they can
be automatically installed with ``npm install`` or `npm link`.

Of particular note, `node-canvas <https://github.com/learnboost/node-canvas>`_
is not a pure-node module and requires the Cairo development sources
(`libcairo2-dev` on Ubuntu & friends) and compilation of some glue C++-code to
work.

Testing
-------

To check if everything works, run `vows <http://vowsjs.org/>`_ in the base
directory.

