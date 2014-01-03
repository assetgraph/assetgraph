_ = require 'underscore'
jsdom = require 'jsdom'
domtohtml = require 'jsdom/lib/jsdom/browser/domtohtml'
errors = require '../errors'
Text = require './Text'
JavaScript = require './JavaScript'
AssetGraph = require '../'

extractEncodingFromText = (text) ->
  metaCharset = undefined
  (text.match(/<meta[^>]+>/g) or []).forEach (metaTagString) ->
    if /\bhttp-equiv=([\"\']|)\s*Content-Type\s*\1/i.test(metaTagString)
      matchContent = metaTagString.match(/\bcontent=([\"\']|)\s*text\/html;\s*charset=([\w\-]*)\s*\1/i)
      if matchContent
        metaCharset = matchContent[2]
    else
      matchSimpleCharset = metaTagString.match(/\bcharset=([\"\']|)\s*([\w\-]*)\s*\1/i)
      if matchSimpleCharset
        metaCharset = matchSimpleCharset[2]

  metaCharset # Will be undefined if not found

isSensitiveByTagName = (tagName) ->
  tagName in ['pre', 'textarea', 'script', 'style']

isWhiteSpaceInsensitiveByTagName = (blockLevelTagName) ->
  blockLevelTagName in ['#document', 'html', 'body', 'head', 'title', 'meta',
  'link', 'style', 'script', 'address', 'blockquote', 'div', 'dl', 'fieldset',
  'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'noscript', 'ol', 'p',
  'pre', 'table', 'ul', 'dd', 'dt', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'tr']

class Html extends Text
  constructor: (config) ->
    if 'isFragment' of config
      @_isFragment = config.isFragment
      delete config.isFragment
    super(config)

  contentType: 'text/html'
  
  supportedExtensions: ['.html', '.template', '.xhtml', '.shtml', '.ko']
  
  isPretty: false
  
  @getter 'encoding', ->
    unless @_encoding
      
      # An explicit encoding (Content-Type header, data: url charset, assetConfig) takes precedence, but if absent we should
      # look for a <meta http-equiv='Content-Type' ...> tag with a charset before falling back to the defaultEncoding (utf-8)
      if '_text' of this
        @_encoding = extractEncodingFromText(@_text) or @defaultEncoding
      else if @_rawSrc
        @_encoding = extractEncodingFromText(@_rawSrc.toString('binary', 0, Math.min(1024, @_rawSrc.length))) or @defaultEncoding
      else
        @_encoding = @defaultEncoding
    @_encoding

  @setter 'encoding', (encoding) ->
    
    # An intended side effect of getting this.parseTree before deleting this._rawSrc is that we're sure
    # that the raw source has been decoded into this._text before the original encoding is thrown away.
    parseTree = @parseTree
    if parseTree.head
      existingMetaElements = parseTree.head.getElementsByTagName('meta')
      contentTypeMetaElement = undefined
      i = 0

      while i < existingMetaElements.length
        metaElement = existingMetaElements[i]
        if metaElement.hasAttribute('charset') or /^content-type$/i.test(metaElement.getAttribute('http-equiv'))
          contentTypeMetaElement = metaElement
          break
        i += 1
      unless contentTypeMetaElement
        contentTypeMetaElement = parseTree.createElement('meta')
        parseTree.head.insertBefore contentTypeMetaElement, parseTree.head.firstChild
        @markDirty()
      if contentTypeMetaElement.hasAttribute('http-equiv')
        if (contentTypeMetaElement.getAttribute('content') or '').toLowerCase() isnt "text/html; charset=#{encoding}"
          contentTypeMetaElement.setAttribute 'content', "text/html; charset=#{encoding}"
          @markDirty()
      else
        
        # Simple <meta charset="...">
        if contentTypeMetaElement.getAttribute('charset') isnt encoding
          contentTypeMetaElement.setAttribute 'charset', encoding
          @markDirty()
    if encoding isnt @encoding
      @_encoding = encoding
      @markDirty()

  @getter 'text', ->
    unless '_text' of this
      if @_parseTree
        @_text = ((if @_parseTree.doctype then "#{@_parseTree.doctype}\n" else '')) + domtohtml.domToHtml(@_parseTree, not @isPretty)
      else
        @_text = @_getTextFromRawSrc()
    @_text

  @getter 'parseTree', ->
    unless @_parseTree
      text = @text
      try
        @_parseTree = jsdom.jsdom(text, `undefined`,
          features:
            ProcessExternalResources: []
            FetchExternalResources: []
            QuerySelector: true
        )
      catch e
        err = new errors.ParseError(
          message: "Parse error in #{@url or "inline Html#{if @nonInlineAncestor then " in #{@nonInlineAncestor.url}" else ''}"}\n" + e.message
          asset: this
        )
        if @assetGraph
          @assetGraph.emit "error", err
        else
          throw err
      
      # Jsdom (or its Html parser) doesn't strip the newline after the <!DOCTYPE> for some reason.
      # Issue reported here: https://github.com/tmpvar/jsdom/issues/160
      @_parseTree.removeChild @_parseTree.firstChild  if @_parseTree.firstChild and @_parseTree.firstChild.nodeName is '#text' and @_parseTree.firstChild.nodeValue is '\n'
    @_parseTree

  @setter 'parseTree', (parseTree) ->
    @unload()
    @_parseTree = parseTree
    @markDirty()

  @getter 'isFragment', ->
    if typeof @_isFragment is 'undefined' and @isLoaded
      document = @parseTree
      @_isFragment = not document.doctype and not document.body and document.getElementsByTagName('head').length is 0
    @_isFragment

  @setter 'isFragment', (isFragment) ->
    @_isFragment = isFragment

  _isRelationUrl: (url) ->
    url and not /^mailto:|^\s*$|^#/i.test(url)

  findOutgoingRelationsInParseTree: ->
    addOutgoingRelation = (outgoingRelation) ->
      outgoingRelation.conditionalComments = [].concat(currentConditionalComments)  if currentConditionalComments.length > 0
      outgoingRelations.push outgoingRelation
    currentConditionalComments = []
    outgoingRelations = []
    if @parseTree.documentElement and @parseTree.documentElement.hasAttribute('manifest')
      addOutgoingRelation new AssetGraph.HtmlCacheManifest(
        from: this
        to:
          url: @parseTree.documentElement.getAttribute('manifest')

        node: @parseTree.documentElement
      )
    queue = [@parseTree]
    while queue.length
      node = queue.shift()
      traverse = true
      if node.nodeType is node.ELEMENT_NODE
        i = 0

        while i < node.attributes.length
          attribute = node.attributes[i]
          if /^on/i.test(attribute.nodeName)
            addOutgoingRelation new AssetGraph.HtmlInlineEventHandler(
              from: this
              attributeName: attribute.nodeName
              to: new JavaScript(
                isExternalizable: false
                quoteChar: "'"
                text: "function bogus() {#{attribute.nodeValue}}"
              )
              node: node
            )
          i += 1
        nodeName = node.nodeName.toLowerCase()
        if nodeName is 'script'
          type = node.getAttribute('type')
          if not type or type is 'text/javascript' or type is 'text/coffeescript'
            src = node.getAttribute('src')
            if src
              if @_isRelationUrl(src)
                addOutgoingRelation new AssetGraph.HtmlScript(
                  from: this
                  to:
                    url: src

                  node: node
                )
            else
              inlineAsset = new (require(if type is 'text/coffeescript' then './CoffeeScript' else './JavaScript'))(text: (if node.firstChild then node.firstChild.nodeValue else ''))
              addOutgoingRelation new AssetGraph.HtmlScript(
                from: this
                to: inlineAsset
                node: node
              )
              
              # Hack: If transforms.registerRequireJsConfig has run, make sure that we register the
              # require.js paths in the inline script before resolving the a data-main attribute
              # further down in the document.
              if inlineAsset.type is 'JavaScript' and @assetGraph and @assetGraph.requireJsConfig
                @assetGraph.requireJsConfig.registerConfigInJavaScript inlineAsset, this
            if node.hasAttribute('data-main')
              url = node.getAttribute('data-main').replace(/(?:\.js)?($|[\?\#])/, '.js$1')
              @assetGraph.requireJsConfig.baseUrl = @assetGraph.resolveUrl(@nonInlineAncestor.url, url).replace(/[^\/]*$/, '')  if @assetGraph and @assetGraph.requireJsConfig and not @assetGraph.requireJsConfig.baseUrl
              addOutgoingRelation new AssetGraph.HtmlRequireJsMain(
                from: this
                to:
                  url: url

                node: node
              )
            if node.hasAttribute('data-almond')
              addOutgoingRelation new AssetGraph.HtmlRequireJsAlmondReplacement(
                from: this
                to:
                  url: node.getAttribute('data-almond').replace(/(?:\.js)?($|[\?\#])/, '.js$1')

                node: node
              )
          else if type is 'text/html' or type is 'text/ng-template'
            addOutgoingRelation new AssetGraph.HtmlInlineScriptTemplate(
              from: this
              to: new Html(
                isExternalizable: false
                text: node.innerHTML or ''
              )
              node: node
            )
        else if nodeName is 'template'
          traverse = false
          addOutgoingRelation new AssetGraph.HtmlTemplate(
            from: this
            to: new Html(
              isFragment: true
              isInline: true
              text: node.innerHTML or ''
            )
            node: node
          )
        else if nodeName is 'style'
          addOutgoingRelation new AssetGraph.HtmlStyle(
            from: this
            to: new (require('./Css'))(text: (if node.firstChild then node.firstChild.nodeValue else ''))
            node: node
          )
        else if nodeName is 'link'
          if node.hasAttribute('rel')
            rel = node.getAttribute('rel')
            if /(?:^| )stylesheet(?:\/less)?(?:$| )/i.test(rel) and @_isRelationUrl(node.getAttribute('href'))
              addOutgoingRelation new AssetGraph.HtmlStyle(
                from: this
                to:
                  url: node.getAttribute('href')

                node: node
              )
            else if /(?:^| )(?:apple-touch-icon(?:-precomposed)?|icon)(?:$| )/i.test(rel) # Also catches rel="shortcut icon"
              if @_isRelationUrl(node.getAttribute('href'))
                addOutgoingRelation new AssetGraph.HtmlShortcutIcon(
                  from: this
                  to:
                    url: node.getAttribute('href')

                  node: node
                )
            else if /(?:^| )apple-touch-startup-image(?:$| )/i.test(rel)
              if @_isRelationUrl(node.getAttribute('href'))
                addOutgoingRelation new AssetGraph.HtmlAppleTouchStartupImage(
                  from: this
                  to:
                    url: node.getAttribute('href')

                  node: node
                )
            else if /(?:^| )alternate(?:$| )/i.test(rel)
              if @_isRelationUrl(node.getAttribute('href'))
                assetConfig = url: node.getAttribute('href')
                assetConfig.contentType = node.getAttribute('type')  if node.hasAttribute('type')
                addOutgoingRelation new AssetGraph.HtmlAlternateLink(
                  from: this
                  to: assetConfig
                  node: node
                )
            else if /(?:^| )search(?:$| )/i.test(rel)
              if @_isRelationUrl(node.getAttribute('href'))
                assetConfig = url: node.getAttribute('href')
                assetConfig.contentType = node.getAttribute('type')  if node.hasAttribute('type')
                addOutgoingRelation new AssetGraph.HtmlSearchLink(
                  from: this
                  to: assetConfig
                  node: node
                )
            else if /(?:^| )fluid-icon(?:$| )/i.test(rel)
              if @_isRelationUrl(node.getAttribute('href'))
                assetConfig = url: node.getAttribute('href')
                assetConfig.contentType = node.getAttribute('type')  if node.hasAttribute('type')
                addOutgoingRelation new AssetGraph.HtmlFluidIconLink(
                  from: this
                  to: assetConfig
                  node: node
                )
            else if /import/i.test(rel)
              if @_isRelationUrl(node.getAttribute('href'))
                assetConfig = url: node.getAttribute('href')
                assetConfig.contentType = node.getAttribute('type') or 'text/html'  if node.hasAttribute('type')
                addOutgoingRelation new AssetGraph.HtmlImport(
                  from: this
                  to: assetConfig
                  node: node
                )
        else if nodeName is 'meta' and node.getAttribute('name') is 'msapplication-TileImage'
          if @_isRelationUrl(node.getAttribute('content'))
            assetConfig = url: node.getAttribute('content')
            addOutgoingRelation new AssetGraph.HtmlMsApplicationTileImageMeta(
              from: this
              to: assetConfig
              node: node
            )
        else if nodeName is 'img'
          srcAttributeValue = node.getAttribute('src')
          srcSetAttributeValue = node.getAttribute('srcset')
          if srcAttributeValue and @_isRelationUrl(srcAttributeValue)
            addOutgoingRelation new AssetGraph.HtmlImage(
              from: this
              to:
                url: srcAttributeValue

              node: node
            )
          if srcSetAttributeValue
            addOutgoingRelation new AssetGraph.HtmlImageSrcSet(
              from: this
              to: new (require('./SrcSet'))(text: srcSetAttributeValue)
              node: node
            )
        else if nodeName is 'a'
          href = node.getAttribute('href')
          if @_isRelationUrl(href)
            addOutgoingRelation new AssetGraph.HtmlAnchor(
              from: this
              to:
                url: href

              node: node
            )
        else if nodeName is 'iframe'
          if @_isRelationUrl(node.getAttribute('src'))
            addOutgoingRelation new AssetGraph.HtmlIFrame(
              from: this
              to:
                url: node.getAttribute('src')

              node: node
            )
          if node.hasAttribute('srcdoc')
            addOutgoingRelation new AssetGraph.HtmlIFrameSrcDoc(
              from: this
              to: new Html(text: node.getAttribute('srcdoc'))
              node: node
            )
        else if nodeName is 'frame'
          if @_isRelationUrl(node.getAttribute('src'))
            addOutgoingRelation new AssetGraph.HtmlFrame(
              from: this
              to:
                url: node.getAttribute('src')

              node: node
            )
        else if nodeName is 'esi:include'
          if @_isRelationUrl(node.getAttribute('src'))
            addOutgoingRelation new AssetGraph.HtmlEdgeSideInclude(
              from: this
              to:
                url: node.getAttribute('src')

              node: node
            )
        else if nodeName is 'video'
          if node.hasAttribute('src')
            if @_isRelationUrl(node.getAttribute('src'))
              addOutgoingRelation new AssetGraph[(if nodeName is 'video' then 'HtmlVideo' else 'HtmlAudio')](
                from: this
                to:
                  url: node.getAttribute('src')

                node: node
              )
          if node.hasAttribute('poster') and @_isRelationUrl(node.getAttribute('poster'))
            addOutgoingRelation new AssetGraph.HtmlVideoPoster(
              from: this
              to:
                url: node.getAttribute('poster')

              node: node
            )
        else if nodeName is 'audio'
          if @_isRelationUrl(node.getAttribute('src'))
            addOutgoingRelation new AssetGraph.HtmlAudio(
              from: this
              to:
                url: node.getAttribute('src')

              node: node
            )
        else if /^(?:source|track)$/.test(nodeName) and node.parentNode and /^(?:video|audio)$/i.test(node.parentNode.nodeName)
          if @_isRelationUrl(node.getAttribute('src'))
            addOutgoingRelation new AssetGraph[(if node.parentNode.nodeName.toLowerCase() is 'video' then 'HtmlVideo' else 'HtmlAudio')](
              from: this
              to:
                url: node.getAttribute('src')

              node: node
            )
        else if nodeName is 'source' and node.parentNode and node.parentNode.nodeName.toLowerCase() is 'picture'
          srcAttributeValue = node.getAttribute('src')
          srcSetAttributeValue = node.getAttribute('srcset')
          if srcAttributeValue and @_isRelationUrl(srcAttributeValue)
            addOutgoingRelation new AssetGraph.HtmlPictureSource(
              from: this
              to:
                url: srcAttributeValue

              node: node
            )
          if srcSetAttributeValue
            addOutgoingRelation new AssetGraph.HtmlPictureSourceSrcSet(
              from: this
              to: new (require('./SrcSet'))(text: srcSetAttributeValue)
              node: node
            )
        else if nodeName is 'object'
          if @_isRelationUrl(node.getAttribute('data'))
            addOutgoingRelation new AssetGraph.HtmlObject(
              from: this
              to:
                url: node.getAttribute('data')

              node: node
              attributeName: 'data'
            )
        else if nodeName is 'param' and /^(?:src|movie)$/i.test(node.getAttribute('name')) and node.parentNode and node.parentNode.nodeName.toLowerCase() is 'object'
          if @_isRelationUrl(node.getAttribute('value'))
            addOutgoingRelation new AssetGraph.HtmlObject(
              from: this
              to:
                url: node.getAttribute('value')

              node: node
              attributeName: 'value'
            )
        else if nodeName is 'applet'
          ['archive', 'codebase'].forEach ((attributeName) ->
            
            # Note: Only supports one url in the archive attribute. The Html 4.01 spec says it can be a comma-separated list.
            if @_isRelationUrl(node.getAttribute(attributeName))
              addOutgoingRelation new AssetGraph.HtmlApplet(
                from: this
                to:
                  url: node.getAttribute(attributeName)

                node: node
                attributeName: attributeName
              )
          ), this
        else if nodeName is 'embed'
          if @_isRelationUrl(node.getAttribute('src'))
            addOutgoingRelation new AssetGraph.HtmlEmbed(
              from: this
              to:
                url: node.getAttribute('src')

              node: node
            )
        if node.hasAttribute('style')
          addOutgoingRelation new AssetGraph.HtmlStyleAttribute(
            from: this
            to: new (require('./Css'))(
              isExternalizable: false
              text: "bogusselector {#{node.getAttribute("style")}}"
            )
            node: node
          )
        if node.hasAttribute('data-bind')
          
          # See if the attribute value can be parsed as a Knockout.js data-bind:
          javaScriptObjectLiteral = "({#{node.getAttribute("data-bind").replace(/^\s*\{(.*)\}\s*$/, "$1")}});"
          parseTree = null # Must be set to something falsy each time we make it here
          try
            parseTree = JavaScript.uglifyJs.parse(javaScriptObjectLiteral)
          if parseTree
            addOutgoingRelation new AssetGraph.HtmlDataBindAttribute(
              from: this
              to: new JavaScript(
                isExternalizable: false
                quoteChar: "'" # Prefer single quotes for consistency with HtmlDataBindAttribute
                parseTree: parseTree
                text: javaScriptObjectLiteral
              )
              node: node
            )
      else if node.nodeType is node.COMMENT_NODE
        
        # <!--[if !IE]> --> ... <!-- <![endif]-->
        # <!--[if IE gte 8]><!--> ... <!--<![endif]--> (evaluated by certain IE versions and all non-IE browsers)
        matchNonInternetExplorerConditionalComment = node.nodeValue.match(/^\[if\s*([^\]]*)\]>\s*(?:<!)?$/)
        if matchNonInternetExplorerConditionalComment
          currentConditionalComments.push node
        else if /^\s*<!\[endif\]\s*$/.test(node.nodeValue)
          if currentConditionalComments.length > 0
            currentConditionalComments.pop()
          else
            warning = new errors.SyntaxError(
              message: "Html: Conditional comment end marker seen without a start marker: #{node.nodeValue}"
              asset: this
            )
            if @assetGraph
              @assetGraph.emit 'warn', warning
            else
              console.warn @toString() + ': ' + warning.message
        else
          
          # <!--[if ...]> .... <![endif]-->
          matchConditionalComment = node.nodeValue.match(/^\[if\s*([^\]]*)\]\>([\s\S]*)<!\[endif\]$/)
          if matchConditionalComment
            addOutgoingRelation new AssetGraph.HtmlConditionalComment(
              from: this
              to: new Html(text: "<!--ASSETGRAPH DOCUMENT START MARKER-->#{matchConditionalComment[2]}<!--ASSETGRAPH DOCUMENT END MARKER-->")
              node: node
              condition: matchConditionalComment[1]
            )
          else
            matchKnockoutContainerless = node.nodeValue.match(/^\s*ko\s+([\s\S]+)$/)
            if matchKnockoutContainerless
              addOutgoingRelation new AssetGraph.HtmlKnockoutContainerless(
                from: this
                to: new (require('./JavaScript'))(
                  isExternalizable: false
                  quoteChar: "'" # Prefer single quotes when serializing to avoid excessive &quot;
                  text: "({#{matchKnockoutContainerless[1]}});"
                )
                node: node
              )
            else
              matchEsi = node.nodeValue.match(/^esi([\s\S]*)$/)
              if matchEsi
                addOutgoingRelation new AssetGraph.HtmlEdgeSideIncludeSafeComment(
                  from: this
                  to: new Html(text: "<!--ASSETGRAPH DOCUMENT START MARKER-->#{matchEsi[1]}<!--ASSETGRAPH DOCUMENT END MARKER-->")
                  node: node
                )
      if traverse and node.childNodes
        i = node.childNodes.length - 1

        while i >= 0
          queue.unshift node.childNodes[i]
          i -= 1
    if currentConditionalComments.length > 0
      warning = new errors.SyntaxError(
        message: "Html: No end marker found for conditional comment(s):\n#{_.pluck(currentConditionalComments, "nodeValue").join("\n  ")}"
        asset: this
      )
      if @assetGraph
        @assetGraph.emit 'warn', warning
      else
        console.warn "#{@toString()}: #{warning.message}"
    outgoingRelations

  ###*
   * Leaves conditional comments, Knockout.js containerless bindings, and SSIs alone even if removeComments is true.
   * @param {[type]} removeWhiteSpace [description]
   * @param {[type]} removeComments [description]
   * @return {[type]} [description]
  ###
  _reformatParseTree: (removeWhiteSpace, removeComments) ->
    (processNode = (node, isWithinSensitiveTag, canRemoveLeadingWhiteSpace, canRemoveTrailingWhiteSpace) ->
      isInWhiteSpaceInsensitiveContext = isWhiteSpaceInsensitiveByTagName(node.nodeName.toLowerCase()) or false
      isWithinSensitiveTag = isWithinSensitiveTag or isSensitiveByTagName(node.nodeName.toLowerCase()) or false
      i = 0

      while i < node.childNodes.length
        childNode = node.childNodes[i]
        if childNode.nodeType is childNode.ELEMENT_NODE
          canRemoveLeadingWhiteSpace = processNode(childNode, isWithinSensitiveTag, canRemoveLeadingWhiteSpace, (if childNode.nextSibling then childNode.nextSibling.nodeType is childNode.TEXT_NODE and /^[ \t\n\r]/.test(childNode.nextSibling.nodeValue) else canRemoveTrailingWhiteSpace))
        else if childNode.nodeType is childNode.COMMENT_NODE
          if /^\s*\/?ko(?:\s|$)/.test(childNode.nodeValue)
            
            # Knockout.js containerless binding start or end marker. Remove superfluous whitespace if removeWhiteSpace is true:
            childNode.nodeValue = childNode.nodeValue.replace(/^\s+|\s+$/g, '')  if removeWhiteSpace
          else if removeComments and not /^ASSETGRAPH DOCUMENT (?:START|END) MARKER$|^#|^\[if|^<!\[endif\]|^esi/.test(childNode.nodeValue)
            
            # Non-SSI, non-conditional comment
            node.removeChild childNode
            i -= 1
          else
            
            # Preserve whitespace after comment nodes that are preserved:
            canRemoveLeadingWhiteSpace = false
        else if childNode.nodeType is childNode.TEXT_NODE
          childNodeValue = childNode.nodeValue
          if childNode.previousSibling and childNode.previousSibling.nodeType is childNode.TEXT_NODE
            
            # Collapse with neighbouring text node:
            childNodeValue = childNode.previousSibling.nodeValue + childNodeValue
            node.removeChild childNode.previousSibling
            i -= 1
          if removeWhiteSpace and not isWithinSensitiveTag
            if canRemoveLeadingWhiteSpace
              childNodeValue = childNodeValue.replace(/^[ \n\r\t]+/, '')
            if canRemoveTrailingWhiteSpace and (not childNode.nextSibling or (childNode.nextSibling.nodeType is childNode.ELEMENT_NODE and isWhiteSpaceInsensitiveByTagName(childNode.nextSibling.nodeName.toLowerCase())))
              childNodeValue = childNodeValue.replace(/[ \n\r\t]+$/, '')
            childNodeValue = childNodeValue.replace(/[ \n\r\t]{2,}/g, ' ')
          if childNodeValue
            canRemoveLeadingWhiteSpace = /[ \n\r\t]$/.test(childNodeValue)
            childNode.nodeValue = childNodeValue
          else
            node.removeChild childNode
            i -= 1
        i += 1
      if node.childNodes.length is 0 and not isInWhiteSpaceInsensitiveContext
        
        # Whitespace after an empty tag in non-block level context should be preserved
        false
      else
        canRemoveLeadingWhiteSpace or isInWhiteSpaceInsensitiveContext
    ) @parseTree, false, true, true

  minify: ->
    @_reformatParseTree true, true
    @isPretty = false
    @markDirty()
    this

  prettyPrint: ->
    @_reformatParseTree true, false
    @isPretty = true
    @markDirty()
    this


# Grrr...
Html::__defineSetter__ 'text', Text::__lookupSetter__('text')
module.exports = Html
