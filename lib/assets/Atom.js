/*global require, module*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Xml = require('./Xml');

function Atom(config) {
    Xml.call(this, config);
}

util.inherits(Atom, Xml);

extendWithGettersAndSetters(Atom.prototype, {
    contentType: 'application/atom+xml',

    defaultExtension: '.atom',

    alternativeExtensions: [] // Avoid reregistering xml
});

module.exports = Atom;
