/*global require, module*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Xml = require('./Xml');

function Rss(config) {
    Xml.call(this, config);
}

util.inherits(Rss, Xml);

extendWithGettersAndSetters(Rss.prototype, {
    contentType: 'application/rss+xml',

    defaultExtension: '.rdf',

    alternativeExtensions: [] // Avoid reregistering xml
});

module.exports = Rss;
