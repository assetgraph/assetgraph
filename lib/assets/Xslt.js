var util = require('util'),
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
