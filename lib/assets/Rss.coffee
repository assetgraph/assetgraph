Xml = require './Xml'

class Rss extends Xml
  contentType: 'application/rss+xml'
  supportedExtensions: ['.rdf']

module.exports = Rss
