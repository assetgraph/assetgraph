/*global require, module*/
var util = require('util'),
    _ = require('underscore'),
    Xml = require('./Xml');

function Atom(config) {
    Xml.call(this, config);
}

util.inherits(Atom, Xml);

_.extend(Atom.prototype, {
    contentType: 'application/atom+xml',

    defaultExtension: '.atom',

    alternativeExtensions: [] // Avoid reregistering xml
});

module.exports = Atom;
