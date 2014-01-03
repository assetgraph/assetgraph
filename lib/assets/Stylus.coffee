Text = require './Text'

class Stylus extends Text
  contentType: null # Avoid reregistering text/plain
  supportedExtensions: ['.styl']

module.exports = Stylus
