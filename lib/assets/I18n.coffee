canonicalizeObject = require('../canonicalizeObject')
Json = require './Json'

class I18n extends Json
  contentType: null # Avoid reregistering application/json
  supportedExtensions: ['.i18n']
  prettyPrint: ->
    super()
    @_parseTree = canonicalizeObject(@_parseTree, 2)

module.exports = I18n
