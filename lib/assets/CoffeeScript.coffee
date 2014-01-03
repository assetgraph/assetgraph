Text = require './Text'

class CoffeeScript extends Text
    contentType: 'text/coffeescript'
    supportedExtensions: ['.coffee']

module.exports = CoffeeScript
