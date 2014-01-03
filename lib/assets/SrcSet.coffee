errors = require '../errors'
Text = require './Text'
AssetGraph = require '../'

class SrcSet extends Text
  constructor: (config) ->
    super(config)
    if not @_parseTree and ('_text' not of this)
      throw new Error('SrcSet: Either parseTree or text must be specified')

  type: 'SrcSet'

  contentType: null # Avoid reregistering application/octet-stream

  supportedExtensions: []

  @getter 'parseTree', ->
    unless @_parseTree
      @_parseTree = []
      @text.split(/,/).forEach ((entryStr) ->
        entryStr = entryStr.replace(/^\s+|\s+$/g, '')
        matchEntryStr = entryStr.match(/^([^\s]+)(.*)$/)
        if matchEntryStr
          extraTokens = matchEntryStr[2].split(/\s+/).filter((extraToken) ->
            not /^\s*$/.test(extraToken)
          )
          @_parseTree.push
            href: matchEntryStr[1]
            extraTokens: extraTokens

        else
          warning = new errors.SyntaxError(
            message: "SrcSet: Could not parse entry: #{entry}"
            asset: this
          )
          if @assetGraph
            @assetGraph.emit 'warn', warning
          else
            console.warn "#{@toString()}: #{warning.message}"
      ), this
    @_parseTree

  @setter 'parseTree', (parseTree) ->
    @unload()
    @_parseTree = parseTree
    @markDirty()

  @getter 'text', ->
    unless '_text' of this
      # We're in trouble if neither this._text, nor this._parseTree is found.
      @_text = @parseTree.map((node) ->
        node.href + (if node.extraTokens.length > 0 then " #{node.extraTokens.join(" ")}" else '')
      ).join(', ')
    @_text

  findOutgoingRelationsInParseTree: ->
    @parseTree.map ((node) ->
      new AssetGraph.SrcSetEntry(
        from: this
        node: node
        to:
          url: node.href
      )
    ), this

module.exports = SrcSet
