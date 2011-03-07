/*global require, module*/
var util = require('util'),
    _ = require('underscore'),
    XML = require('./XML').XML;

function RSS(config) {
    XML.call(this, config);
}

util.inherits(RSS, XML);

_.extend(RSS.prototype, {
    contentType: 'application/rss+xml',

    defaultExtension: 'rdf',

    alternativeExtensions: [] // Avoid reregistering xml
});

exports.RSS = RSS;
