Asset = require './Asset'

class Flash extends Asset
  contentType: 'application/x-shockwave-flash'
  supportedExtensions: ['.swf']

module.exports = Flash
