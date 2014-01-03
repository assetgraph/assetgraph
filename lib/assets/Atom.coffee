Xml = require './Xml'

class Atom extends Xml
  contentType: 'application/atom+xml'
  supportedExtensions: ['.atom']

module.exports = Atom
