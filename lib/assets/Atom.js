/*global require, module*/
var util = require('util'),
    _ = require('underscore'),
    XML = require('./XML');

function Atom(config) {
    XML.call(this, config);
}

util.inherits(Atom, XML);

_.extend(Atom.prototype, {
    contentType: 'application/atom+xml',

    defaultExtension: '.atom',

    alternativeExtensions: [] // Avoid reregistering xml
});

module.exports = Atom;
