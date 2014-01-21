/*global require, module*/
var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Xml = require('./Xml');

function Rss(config) {
    Xml.call(this, config);
}

util.inherits(Rss, Xml);

extendWithGettersAndSetters(Rss.prototype, {
    contentType: 'application/rss+xml',

    supportedExtensions: ['.rdf']
});

module.exports = Rss;
