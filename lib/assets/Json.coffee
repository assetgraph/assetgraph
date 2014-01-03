errors = require '../errors'
Text = require './Text'

class Json extends Text
  contentType: 'application/json'
  supportedExtensions: ['.json']
  isPretty: false

  @getter 'parseTree', ->
    unless @_parseTree
      try
        @_parseTree = JSON.parse(@text)
      catch e
        err = new errors.ParseError(
          message: "Json parse error in #{@url or "(inline)"}: #{e.message}"
          asset: this
        )
        if @assetGraph
          @assetGraph.emit 'error', err
        else
          throw err
    @_parseTree

  @setter 'parseTree', (parseTree) ->
    @unload()
    @_parseTree = parseTree
    @markDirty()

  @getter 'text', ->
    unless '_text' of this
      if @_parseTree
        if @isPretty
          @_text = JSON.stringify(@_parseTree, `undefined`, '    ') + '\n'
        else
          @_text = JSON.stringify(@_parseTree)
      else
        @_text = @_getTextFromRawSrc()
    @_text

  prettyPrint: ->
    @isPretty = true
    parseTree = @parseTree # So markDirty removes this._text
    @markDirty()
    this

  minify: ->
    @isPretty = false
    parseTree = @parseTree # So markDirty removes this._text
    @markDirty()
    this

Json::__defineSetter__ 'text', Text::__lookupSetter__('text')
module.exports = Json
