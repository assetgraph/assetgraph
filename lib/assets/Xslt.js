var util = require('util'),
    _ = require('underscore'),
    DOMParser = require('xmldom').DOMParser,
    errors = require('../errors'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Xml = require('./Xml');

function Xslt(config) {
    Xml.call(this, config);
}

util.inherits(Xslt, Xml);

extendWithGettersAndSetters(Xslt.prototype, {
    contentType: 'text/xslt+xml',

    supportedExtensions: ['.xsl', '.xslt'],

    isPretty: false
});

module.exports = Xslt;
