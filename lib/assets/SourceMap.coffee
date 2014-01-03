AssetGraph = require '../'
sourceMap = require 'source-map'
Text = require './Text'

class SourceMap extends Text
  contentType: null # Avoid reregistering application/json
  supportedExtensions: ['.map']

  @getter 'parseTree', ->
    unless @_parseTree
      try
        # Ignore leading )]} (allowed by the source map spec)
        obj = JSON.parse(@text.replace(/^\)\]\}/, ''))
      catch e
        err = new errors.ParseError(
          message: "Json parse error in #{@url or '(inline)'}: #{e.message}"
          asset: this
        )
        if @assetGraph
          @assetGraph.emit 'error', err
        else
          throw err
      if obj
        @_parseTree = new sourceMap.SourceMapConsumer obj
    @_parseTree

  findOutgoingRelationsInParseTree: ->
    parseTree = @parseTree
    outgoingRelations = []
    if parseTree.file
      outgoingRelations.push new AssetGraph.SourceMapFile(
        from: this
        to:
          url: parseTree.file
      )
    if Array.isArray(parseTree.sources)
      parseTree.sources.forEach ((sourceUrl, i) ->
        outgoingRelations.push new AssetGraph.SourceMapSource(
          from: this
          index: i # This isn't too robust
          to:
            url: sourceUrl
        )
      ), this
    outgoingRelations

module.exports = SourceMap
