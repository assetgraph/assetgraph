const Xml = require('./Xml');

class Xslt extends Xml {}

Object.assign(Xslt.prototype, {
  contentType: 'text/xslt+xml',

  supportedExtensions: ['.xsl', '.xslt'],

  isPretty: false
});

module.exports = Xslt;
