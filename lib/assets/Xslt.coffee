Xml = require './Xml'

class Xslt extends Xml
  contentType: 'text/xslt+xml'
  supportedExtensions: ['.xsl', '.xslt']
  isPretty: false

module.exports = Xslt
