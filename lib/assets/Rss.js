/*global require, module*/
var util = require('util'),
    _ = require('underscore'),
    Xml = require('./Xml');

function Rss(config) {
    Xml.call(this, config);
}

util.inherits(Rss, Xml);

_.extend(Rss.prototype, {
    contentType: 'application/rss+xml',

    defaultExtension: '.rdf',

    alternativeExtensions: [] // Avoid reregistering xml
});

module.exports = Rss;
