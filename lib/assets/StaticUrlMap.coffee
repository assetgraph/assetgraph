_ = require 'underscore'
AssetGraph = require '../'
uglifyJs = require('./JavaScript').uglifyJs
uglifyAst = require('./JavaScript').uglifyAst
errors = require '../errors'
Asset = require './Asset'
urlTools = require 'url-tools'

class StaticUrlMap extends Asset
  constructor: (config) ->
    super(config)
    unless @_parseTree
      throw new Error('StaticUrlMap: parseTree config option is mandatory')

  type: 'StaticUrlMap'

  contentType: null # Avoid reregistering application/octet-stream
  
  supportedExtensions: []
  
  findOutgoingRelationsInParseTree: ->
    outgoingRelations = []
    if @_parseTree[0] instanceof uglifyJs.AST_String
      
      # GETSTATICURL('foo/bar', ...);
      url = @_parseTree[0].value
      @originalWildCardRelation = new AssetGraph.StaticUrlMapEntry(
        from: this
        href: url
        to:
          url: url
      )
      @wildCardValueAsts = @_parseTree.slice(1)
      outgoingRelations.push @originalWildCardRelation
    else if @_parseTree[0] instanceof uglifyJs.AST_PropAccess
      
      # GETSTATICURL({foo: "bar"}[...]);
      @relationByWildCardValues = {}
      @wildCardValueAsts = []
      cursor = @_parseTree[0]
      while cursor instanceof uglifyJs.AST_PropAccess
        @wildCardValueAsts.push (if typeof cursor.property is 'string' then new uglifyJs.AST_String(cursor.property) else cursor.property)
        cursor = cursor.expression
      @wildCardValueAsts.reverse()
      keys = []
      
      # node.properties[i].value instanceof uglifyJs.AST_Object
      populateUrlByWildCardValues = (node, relationByWildCardValuesCursor, nestingLevel) =>
        if nestingLevel > @wildCardValueAsts.length or not node or not (node instanceof uglifyJs.AST_Object)
          throw new errors.SyntaxError(
            message: "StaticUrlMap: Unsupported syntax: #{@_parseTree[0].print_to_string()}"
            asset: this
          )

        i = 0
        while i < node.properties.length
          key = node.properties[i].key
          if node.properties[i].value instanceof uglifyJs.AST_String
            if nestingLevel isnt @wildCardValueAsts.length
              throw new errors.SyntaxError(
                message: "StaticUrlMap: Unsupported syntax: #{@_parseTree[0].print_to_string()}"
                asset: this
              )
            relationByWildCardValuesCursor[key] = new AssetGraph.StaticUrlMapEntry(
              from: this
              href: node.properties[i].value.value
              wildCardValues: [].concat(keys)
              to:
                url: node.properties[i].value.value
            )
            outgoingRelations.push relationByWildCardValuesCursor[key]
          else
            relationByWildCardValuesCursor[key] = relationByWildCardValuesCursor[key] or {}
            keys.push key
            populateUrlByWildCardValues node.properties[i].value, relationByWildCardValuesCursor[key], nestingLevel + 1
            keys.pop key
          i += 1
        return
      populateUrlByWildCardValues cursor, @relationByWildCardValues, 1
    else
      throw new errors.SyntaxError(
        message: "StaticUrlMap: Unsupported syntax: #{@_parseTree[0].print_to_string()}"
        asset: this
      )
    outgoingRelations

  toAst: ->
    # If the nesting level is 0 and there are wildcards, it means that they
    # expanded to a single file, so no additional StaticUrlMapEntry relations
    # have been attached. This is all terribly confusing. Everything relating
    # to GETSTATICURL should be rewritten.
    nestingLevel = 0
    convert = (obj) ->
      if obj.isRelation
        # When a multiplied relation is attached, it won't have a 'href' until
        # the populate transform calls relation.refreshHref() on the next
        # line. This annoyance might get fixed if the base asset resolution
        # could be moved to Asset, but I'm unsure about that:
        new uglifyJs.AST_String(value: obj.href or 'n/a')
      else
        nestingLevel += 1
        new uglifyJs.AST_Object(properties: _.map(obj, (value, key) ->
          new uglifyJs.AST_ObjectKeyVal(
            key: key
            value: convert(value)
          )
        ))

    expressionAst = convert(
      @relationByWildCardValues or @originalWildCardRelation
    )
    if nestingLevel > 0
      @wildCardValueAsts.forEach (wildCardValueAst) ->
        expressionAst = new uglifyJs.AST_Sub(
          expression: expressionAst
          property: wildCardValueAst
        )

    expressionAst

module.exports = StaticUrlMap
