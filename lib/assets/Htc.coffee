Html = require './Html'

class Htc extends Html
  contentType: 'text/x-component'
  supportedExtensions: ['.htc']

module.exports = Htc
