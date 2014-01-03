_ = require 'underscore'
cssom = require 'cssom-papandreou'
cssmin = require 'cssmin'
errors = require '../errors'
Text = require './Text'
AssetGraph = require '../'

propertyWithImageUrlRegExp = /^(?:content|_?cursor|_?background(?:-image)?|(?:-[a-z]+-)?(?:border-image(?:-source)?|mask|mask-image|mask-image-source|mask-box-image|mask-box-image-source))$/
urlTokenRegExp = /\burl\((\'|\"|)([^\'\"]+?)\1\)/g
alphaImageLoaderSrcRegExp = /AlphaImageLoader\([^\)]*src=([\'\"])(.+?)(\1)[^\)]*\)/g

extractEncodingFromText = (text) ->
  matchCharset = text.match(/@charset\s*([\'\"])\s*([\w\-]+)\s*\1/i)
  matchCharset and matchCharset[2] # Will be undefined in case of no match


class Css extends Text
  contentType: 'text/css'
  supportedExtensions: ['.css']
  isPretty: false

  @property 'encoding',
    get: ->
      unless @_encoding
        if '_text' of this
          @_encoding = extractEncodingFromText(@_text) or @defaultEncoding
        else if @_rawSrc
          @_encoding = extractEncodingFromText(@_rawSrc.toString('binary', 0, Math.min(1024, @_rawSrc.length))) or @defaultEncoding
        else
          @_encoding = @defaultEncoding
      @_encoding
    set: (encoding) ->
      if encoding isnt @encoding
        # Make sure this._text exists so the rawSrc is decoded before the
        # original encoding is thrown away
        text = @text
        delete @_rawSrc

        @_encoding = encoding
        @markDirty()

  @property 'text',
    get: ->
      unless '_text' of this
        if @_parseTree
          @_text = @_parseTree.toString()
          @_text = cssmin.cssmin(@_text)  unless @isPretty
        else
          @_text = @_getTextFromRawSrc()
      @_text

  @property 'parseTree',
    get: ->
      unless @_parseTree
        # CSSOM gets the @charset declaration mixed up with the first selector:
        try
          @_parseTree = cssom.parse(@text.replace(/@charset\s*([\'\"])\s*[\w\-]+\s*\1;/, ''))
        catch e
          err = new errors.ParseError(
            message: "Parse error in #{@urlOrDescription}(line #{e.line}, column #{e["char"]}):\n#{e.message}#{if e.styleSheet then "\nFalling back to using the #{e.styleSheet.cssRules.length} parsed CSS rules" else ''}"
            styleSheet: e.styleSheet
            line: e.line
            column: e['char']
            asset: this
          )
          if @assetGraph
            if err.styleSheet
              @_parseTree = err.styleSheet
            else
              @_parseTree = cssRules: []
            @assetGraph.emit 'error', err
          else
            throw err
      @_parseTree
    set: (parseTree) ->
      @unload()
      @_parseTree = parseTree
      @markDirty()

  @property 'isEmpty',
    get: ->
      @parseTree.cssRules.length is 0

  minify: ->
    @isPretty = false
    parseTree = @parseTree # So markDirty removes this._text
    @markDirty()
    this

  prettyPrint: ->
    @isPretty = true
    parseTree = @parseTree # So markDirty removes this._text
    @markDirty()
    this

  findOutgoingRelationsInParseTree: ->
    outgoingRelations = []
    @eachRuleInParseTree((cssRule, parentRuleOrStylesheet) =>
      if cssRule.type is cssom.CSSRule.IMPORT_RULE
        outgoingRelations.push new AssetGraph.CssImport(
          from: this
          to:
            url: cssRule.href

          parentRule: parentRuleOrStylesheet
          cssRule: cssRule
        )
      else if cssRule.type is cssom.CSSRule.FONT_FACE_RULE
        src = cssRule.style.getPropertyValue('src')
        if src
          matchUrlToken = undefined
          tokenNumber = 0
          urlTokenRegExp.lastIndex = 0 # Just in case
          while (matchUrlToken = urlTokenRegExp.exec(src))
            outgoingRelations.push new AssetGraph.CssFontFaceSrc(
              from: this
              to:
                url: matchUrlToken[2]

              tokenNumber: tokenNumber++
              parentRule: parentRuleOrStylesheet
              cssRule: cssRule
            )
      else if cssRule.type is cssom.CSSRule.STYLE_RULE
        style = cssRule.style
        i = 0

        while i < style.length
          propertyName = style[i]
          if propertyWithImageUrlRegExp.test(style[i])
            matchUrlToken = undefined
            tokenNumber = 0
            propertyValue = style.getPropertyValue(propertyName)
            urlTokenRegExp.lastIndex = 0 # Just in case
            while (matchUrlToken = urlTokenRegExp.exec(propertyValue))
              outgoingRelations.push new AssetGraph.CssImage(
                from: this
                to:
                  url: matchUrlToken[2]

                tokenNumber: tokenNumber++
                parentRule: parentRuleOrStylesheet
                cssRule: cssRule
                propertyName: propertyName
              )
          i += 1
        ['behavior', '_behavior'].forEach ((propertyName) ->
          if propertyName of style
            # Skip behavior properties that have # as the first char in
            # the url so that stuff like behavior(#default#VML) won't be
            # treated as a relation.
            matchUrl = style[propertyName].match(/\burl\((\'|\"|)([^#\'\"][^\'\"]*?)\1\)/)
            if matchUrl
              outgoingRelations.push new AssetGraph.CssBehavior(
                from: this
                to:
                  url: matchUrl[2]

                parentRule: parentRuleOrStylesheet
                cssRule: cssRule
                propertyName: propertyName
              )
        ), this
        ['filter', '_filter', '-ms-filter'].forEach ((propertyName) ->
          if propertyName of style
            tokenNumber = 0
            value = style.getPropertyValue(propertyName)
            matchSrcToken = undefined
            alphaImageLoaderSrcRegExp.lastIndex = 0 # Just in case
            while (matchSrcToken = alphaImageLoaderSrcRegExp.exec(value))
              outgoingRelations.push new AssetGraph.CssAlphaImageLoader(
                from: this
                to:
                  url: matchSrcToken[2]

                tokenNumber: tokenNumber++
                parentRule: parentRuleOrStylesheet
                cssRule: cssRule
                propertyName: propertyName
              )
        ), this
    )
    outgoingRelations

  # If lambda returns false, subrules won't be traversed
  eachRuleInParseTree: (lambda, ruleOrStylesheet=@parseTree) ->
    _.toArray(ruleOrStylesheet.cssRules).forEach (cssRule) =>
      if lambda(cssRule, ruleOrStylesheet) isnt false and cssRule.cssRules
        @eachRuleInParseTree lambda, cssRule

module.exports = Css
