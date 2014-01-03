_ = require 'underscore'
uglifyJs = require 'uglify-js-papandreou'
uglifyAst = require('uglifyast')(uglifyJs)
errors = require '../errors'
Text = require './Text'
urlTools = require 'url-tools'
AssetGraph = require '../'

isNamedDefineNode = (node) ->
  node instanceof uglifyJs.AST_Call and
  node.expression instanceof uglifyJs.AST_Symbol and
  node.expression.name is 'define' and
  node.args.length is 2 and
  node.args[0] instanceof uglifyJs.AST_String

shouldCommentNodeBePreservedInNonPrettyPrintedOutput = (node, comment) ->
  /@preserve|@license|@cc_on|[@#]\s*sourceURL|[#@]\s*sourceMappingURL|^!/.test comment.value

class JavaScript extends Text
  contentType: 'application/javascript' # TODO: Double check that this is everyone's recommended value
  supportedExtensions: ['.js']
  isPretty: false

  @getter 'text', ->
    unless '_text' of this
      parseTree = @_parseTree
      if parseTree
        outputStream = uglifyJs.OutputStream(
          
          # Preserve all comments when isPretty is true, and only preserve
          # copyright notices/license info when it's false:
          comments: @isPretty or shouldCommentNodeBePreservedInNonPrettyPrintedOutput
          beautify: @isPretty
          quote_char: @quoteChar
          source_map: null
        )
        parseTree.print outputStream
        text = outputStream.get()

        # Always end with a semicolon like the UglifyJS binary
        text = text.replace(/;*$/, ';')
        
        # Workaround for https://github.com/mishoo/UglifyJS2/issues/180
        if parseTree.end and parseTree.end.comments_before and not parseTree.end._comments_dumped
          parseTree.end.comments_before.forEach ((comment) ->
            if @isPretty or shouldCommentNodeBePreservedInNonPrettyPrintedOutput(parseTree.end, comment)
              if comment.type is 'comment1'
                text += '//' + comment.value + '\n'
              else text += '/*' + comment.value + '*/'  if comment.type is 'comment2'
          ), this
        @_text = text
        
        # Temporary workaround for https://github.com/mishoo/UglifyJS2/issues/218
        parseTree.walk new uglifyJs.TreeWalker((node) ->
          node.start._comments_dumped = false  if node.start
          node.end._comments_dumped = false  if node.end
        )
      else
        @_text = @_getTextFromRawSrc()
    @_text

  @getter 'parseTree', ->
    unless @_parseTree
      text = @text
      
      # If the source ends with one or more comment, add an empty statement
      # at the end so there's a token for the UglifyJS parser to attach them
      # to (workaround for https://github.com/mishoo/UglifyJS2/issues/180)
      text += "\n;" if /(?:\/\/[^\r\n]*|\*\/)[\r\s\n]*$/.test(text)
      try
        @_parseTree = uglifyJs.parse(text)
      catch e
        err = new errors.ParseError(
          message: "Parse error in #{@urlOrDescription}\n#{e.message} (line #{e.line}, column #{e.col + 1})"
          line: e.line
          column: e.col + 1
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

  @getter 'isEmpty', ->
    @parseTree.body.length is 0

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
    syntaxErrors = []
    warnings = []
    assetGraph = @assetGraph

    if assetGraph and assetGraph.requireJsConfig and @incomingRelations.some((incomingRelation) ->
      /^JavaScript(?:ShimRequire|Amd(?:Define|Require))$/.test incomingRelation.type
    )
      moduleName = assetGraph.requireJsConfig.getModuleName(this, new AssetGraph.JavaScriptShimRequire( # Argh!
        from: this
        href: "bogus"
      ).baseAsset.nonInlineAncestor.url)
      shimConfig = assetGraph.requireJsConfig.shim[moduleName]
      if shimConfig and shimConfig.deps
        assetGraph.requireJsConfig.shim[moduleName].deps.forEach ((shimModuleName) ->
          outgoingRelation = new AssetGraph.JavaScriptShimRequire(
            requireJsConfig: @assetGraph and @assetGraph.requireJsConfig # Hmmm
            from: this
            href: shimModuleName
          )
          outgoingRelation.to = url: outgoingRelation.targetUrl
          outgoingRelations.push outgoingRelation
        ), this

    nestedDefineNodes = []
    tryFoldConstantToString = (node, parentNode) =>
      if node instanceof uglifyJs.AST_Constant
        node
      else
        foldedNode = uglifyAst.foldConstant(node)
        if foldedNode instanceof uglifyJs.AST_String
          @markDirty()
          foldedNode
        else
          node

    seenComments = []

    walker = new uglifyJs.TreeWalker(((node, descend) ->
      stack = walker.stack
      parentNode = walker.parent()
      [node.start, node.end].forEach ((token) ->
        if token and token.comments_before
          token.comments_before.forEach ((comment) ->
            matchSourceUrlOrSourceMappingUrl = comment.value.match(/[@#]\s*source(Mapping)?URL=([^\s\n]*)/)
            if matchSourceUrlOrSourceMappingUrl and seenComments.indexOf(comment) is -1
              if matchSourceUrlOrSourceMappingUrl[1] is 'Mapping'
                outgoingRelations.push new AssetGraph.JavaScriptSourceMappingUrl(
                  from: this
                  node: comment
                  to:
                    url: matchSourceUrlOrSourceMappingUrl[2]
                    # Source maps are currently served as application/json, so
                    # prevent the target asset from being loaded as a Json
                    # asset:
                    type: 'SourceMap'
                )
              else
                outgoingRelations.push new AssetGraph.JavaScriptSourceUrl(
                  from: this
                  node: comment
                  to:
                    url: matchSourceUrlOrSourceMappingUrl[2]
                )
              seenComments.push comment
          ), this
      ), this

      if node instanceof uglifyJs.AST_Call
        parentParentNode = stack[stack.length - 3]
        if node.expression instanceof uglifyJs.AST_Dot and
           node.expression.property is 'module' and
           node.expression.expression instanceof uglifyJs.AST_SymbolRef and
           node.expression.expression.name is 'angular'

          diveIntoAngularMethodCall = (argumentNodes, templateCacheVariableName) =>
            angularWalker = new uglifyJs.TreeWalker (node) =>
              _parentNode = angularWalker.parent()
              if node instanceof uglifyJs.AST_Object
                node.properties.forEach(((keyValue) ->
                  if keyValue.key is "templateUrl" and keyValue.value instanceof uglifyJs.AST_String
                    outgoingRelations.push new AssetGraph.JavaScriptAngularJsTemplate(
                      from: this
                      to:
                        type: "Html"
                        url: keyValue.value.value
                      node: keyValue
                      parentNode: node
                    )
                  else if keyValue.key is "template" and
                          keyValue.value instanceof uglifyJs.AST_String

                    outgoingRelations.push new AssetGraph.JavaScriptAngularJsTemplate(
                      from: this
                      to: new AssetGraph.Html(text: keyValue.value.value)
                      node: keyValue
                      parentNode: node
                    )
                ), this)
              else if node instanceof uglifyJs.AST_SimpleStatement
                # Use the statements array of the function instead:
                if _parentNode instanceof uglifyJs.AST_Function
                  _parentNode = _parentNode.body
                if node.body instanceof uglifyJs.AST_Call and
                   node.body.expression instanceof uglifyJs.AST_Dot and
                   node.body.expression.property is "put" and
                   node.body.expression.expression instanceof uglifyJs.AST_SymbolRef and
                   node.body.expression.expression.name is templateCacheVariableName and
                   node.body.args.length is 2 and
                   node.body.args[0] instanceof uglifyJs.AST_String and
                   node.body.args[1] instanceof uglifyJs.AST_String

                  outgoingRelations.push new AssetGraph.JavaScriptAngularJsTemplateCacheAssignment(
                    from: this
                    to: new AssetGraph.Html(
                      isExternalizable: false
                      text: node.body.args[1].value
                    )
                    node: node
                    parentNode: _parentNode
                  )
            argumentNodes.forEach((argumentNode) ->
              argumentNode.walk angularWalker
            )

          stackPosition = stack.length - 1
          while stack[stackPosition - 1] instanceof uglifyJs.AST_Dot and stack[stackPosition - 2] instanceof uglifyJs.AST_Call
            callNode = stack[stackPosition - 2]
            methodName = stack[stackPosition - 1].property
            argumentNodes = callNode.args
            templateCacheVariableName = undefined
            if methodName is 'run' and
               argumentNodes.length > 0 and
               argumentNodes[0] instanceof uglifyJs.AST_Array and
               argumentNodes[0].elements.length is 2 and
               argumentNodes[0].elements[0] instanceof uglifyJs.AST_String and
               argumentNodes[0].elements[0].value is '$templateCache' and
               argumentNodes[0].elements[1] instanceof uglifyJs.AST_Function
              
              templateCacheVariableName = argumentNodes[0].elements[1].argnames[0].name
            diveIntoAngularMethodCall argumentNodes, templateCacheVariableName
            stackPosition -= 2

        if node.expression instanceof uglifyJs.AST_Symbol and node.expression.name is 'INCLUDE'
          if node.args.length is 1 and node.args[0] instanceof uglifyJs.AST_String
            outgoingRelations.push new AssetGraph.JavaScriptInclude(
              from: this
              to:
                url: node.args[0].value
              node: node
              detachableNode: (if parentNode instanceof uglifyJs.AST_Seq then node else parentNode)
              parentNode: (if parentNode instanceof uglifyJs.AST_Seq then parentNode else parentParentNode)
            )
          else
            syntaxErrors.push new errors.SyntaxError(
              message: "Invalid INCLUDE syntax: Must take a single string argument:#{node.print_to_string()}"
              asset: this
            )
        else if node.expression instanceof uglifyJs.AST_Symbol and node.expression.name is 'GETTEXT'
          if node.args.length is 1
            # TRHTML(GETTEXT(...)) is covered by TRHTML below:
            if not (parentNode instanceof uglifyJs.AST_Call) or
               not (parentNode.expression instanceof uglifyJs.AST_Symbol) or
               parentNode.expression.name isnt "TRHTML"

              node.args[0] = tryFoldConstantToString(node.args[0])
              if node.args[0] instanceof uglifyJs.AST_String
                outgoingRelations.push new AssetGraph.JavaScriptGetText(
                  from: this
                  parentNode: parentNode
                  to:
                    url: node.args[0].value
                  node: node
                )
              else
                syntaxErrors.push new errors.SyntaxError(
                  message: "Invalid GETTEXT syntax: #{node.print_to_string()}"
                  asset: this
                )
          else
            syntaxErrors.push new errors.SyntaxError(
              message: "Invalid GETTEXT syntax: #{node.print_to_string()}"
              asset: this
            )
        else if node.expression instanceof uglifyJs.AST_Symbol and node.expression.name is 'GETSTATICURL'
          outgoingRelations.push new AssetGraph.JavaScriptGetStaticUrl(
            from: this
            parentNode: parentNode
            node: node
            to: new AssetGraph.StaticUrlMap(parseTree: node.clone().args)
          )
        else if node.expression instanceof uglifyJs.AST_Symbol and node.expression.name is 'TRHTML'
          outgoingRelation = undefined
          if node.args[0] instanceof uglifyJs.AST_Call and
             node.args[0].expression instanceof uglifyJs.AST_Symbol and
             node.args[0].expression.name is 'GETTEXT' and
             node.args[0].args.length is 1

            node.args[0].args[0] = tryFoldConstantToString(node.args[0].args[0])
            if node.args[0].args[0] instanceof uglifyJs.AST_String
              outgoingRelation = new AssetGraph.JavaScriptTrHtml(
                from: this
                parentNode: parentNode
                node: node
                to:
                  url: node.args[0].args[0].value
              )
          else
            node.args[0] = tryFoldConstantToString(node.args[0])
            if node.args[0] instanceof uglifyJs.AST_String
              outgoingRelation = new AssetGraph.JavaScriptTrHtml(
                from: this
                parentNode: parentNode
                node: node
                to: new AssetGraph.Html(
                  node: node
                  text: node.args[0].value
                )
              )
          if outgoingRelation
            outgoingRelations.push outgoingRelation
          else
            syntaxErrors.push new errors.SyntaxError(
              message: "Invalid TRHTML syntax: #{node.print_to_string()}"
              asset: this
            )
        else if node.expression instanceof uglifyJs.AST_Symbol and
                (node.expression.name is 'require' or node.expression.name is 'requirejs') and 
                ((node.args.length is 2 and node.args[1] instanceof uglifyJs.AST_Function) or node.args.length is 1) and
                node.args[0] instanceof uglifyJs.AST_Array

          # There's no 3 argument version of require, so check whether the
          # require is succeeded by define('moduleName', ...); like
          # flattenRequireJs and r.js would output. If it is, don't model it
          # as a relation.
          parentIndex = stack.length - 1
          isSucceededByDefineWithStringArg = false

          (->
            parentIndex = stack.length - 1
            while parentIndex >= 0
              if stack[parentIndex] instanceof uglifyJs.AST_Block
                blockNode = stack[parentIndex]
                i = blockNode.body.indexOf(stack[parentIndex + 1])

                while i < blockNode.body.length
                  if blockNode.body[i] instanceof uglifyJs.AST_SimpleStatement and isNamedDefineNode(blockNode.body[i].body)
                    isSucceededByDefineWithStringArg = true
                    return
                  i += 1
                return
              else if stack[parentIndex] instanceof uglifyJs.AST_Seq
                seenDefine = false
                stack[parentIndex].walk new uglifyJs.TreeWalker((_node) ->
                  if _node is node
                    seenDefine = true
                  else if seenDefine and isNamedDefineNode(_node)
                    isSucceededByDefineWithStringArg = true
                )
                return
              else
                parentIndex -= 1
          )()

          unless isSucceededByDefineWithStringArg
            arrayNode = node.args[0]
            arrayNode.elements.forEach ((arrayItemAst, i) ->
              arrayItemAst = arrayNode.elements[i] = tryFoldConstantToString(arrayItemAst)
              if arrayItemAst instanceof uglifyJs.AST_String
                if ['require', 'exports', 'module'].indexOf(arrayItemAst.value) is -1
                  outgoingRelation = new AssetGraph.JavaScriptAmdRequire(
                    requireJsConfig: @assetGraph and @assetGraph.requireJsConfig # Hmm
                    from: this
                    callNode: node
                    arrayNode: arrayNode
                    node: arrayItemAst
                  )
                  outgoingRelation.to = url: outgoingRelation.targetUrl
                  outgoingRelations.push outgoingRelation
              else
                warnings.push new errors.SyntaxError(
                  "Skipping non-string JavaScriptAmdRequire item: #{node.print_to_string()}"
                )
            ), this
        else if node.expression instanceof uglifyJs.AST_Symbol and node.expression.name is 'define'
          if node.args.length is 2 and node.args[0] instanceof uglifyJs.AST_Array
            arrayNode = node.args[0]
            arrayNode.elements.forEach ((arrayItemAst, i) ->
              arrayNode.elements[i] = arrayItemAst = tryFoldConstantToString(arrayItemAst)
              if arrayItemAst instanceof uglifyJs.AST_String
                if ['require', 'exports', 'module'].indexOf(arrayItemAst.value) is -1
                  outgoingRelation = new AssetGraph.JavaScriptAmdDefine(
                    requireJsConfig: @assetGraph and @assetGraph.requireJsConfig # Hmm
                    from: this
                    callNode: node
                    arrayNode: arrayNode
                    node: arrayItemAst
                  )
                  outgoingRelation.to = url: outgoingRelation.targetUrl
                  outgoingRelations.push outgoingRelation
              else
                warnings.push new errors.SyntaxError(
                  "Skipping non-string JavaScriptAmdDefine item: #{node.print_to_string()}"
                )
            ), this

          # Keep track of the fact that we're in the body of a define(function
          # () {...}) that might contain
          # JavaScriptRequireJsCommonJsCompatibilityRequire relations
          lastArgument = node.args.length > 0 and node.args[node.args.length - 1]
          if lastArgument and lastArgument instanceof uglifyJs.AST_Function
            nestedDefineNodes.push node
            descend()
            nestedDefineNodes.pop()
            true # Tell the TreeWalker not to descend again
        else if node.expression instanceof uglifyJs.AST_Symbol and
                node.expression.name is 'require' and
                node.args.length is 1 and
                node.args[0] instanceof uglifyJs.AST_String

          if nestedDefineNodes.length > 0
            parentDefineNode = nestedDefineNodes[nestedDefineNodes.length - 1]
            unless parentDefineNode.args[0] instanceof uglifyJs.AST_String
              outgoingRelation = new AssetGraph.JavaScriptRequireJsCommonJsCompatibilityRequire(
                parentDefineNode: parentDefineNode
                requireJsConfig: @assetGraph and @assetGraph.requireJsConfig # Hmm
                from: this
                node: node
              )
              outgoingRelation.to = url: outgoingRelation.targetUrl
              outgoingRelations.push outgoingRelation
          else
            baseUrl = @nonInlineAncestor.url
            if /^file:/.test(baseUrl)
              Module = require('module')
              path = require('path')
              fileName = urlTools.fileUrlToFsPath(baseUrl)
              fakeModule = new Module(fileName)
              resolvedFileName = undefined
              fakeModule.filename = fileName
              fakeModule.paths = Module._nodeModulePaths(
                path.dirname(fakeModule.filename)
              )
              try
                resolvedFileName = Module._resolveFilename(
                  node.args[0].value, fakeModule
                )
                if Array.isArray(resolvedFileName)
                  resolvedFileName = resolvedFileName[0] # Node 0.4?
              catch e
                warnings.push new errors.SyntaxError(
                  message: "Couldn't resolve #{node.print_to_string()}, skipping"
                  relationType: 'JavaScriptCommonJsRequire'
                )
              # Skip built-in and unresolvable modules (they just resolve to
              # 'fs', 'util', etc., not a file name):
              if /^\//.test(resolvedFileName)
                outgoingRelations.push new AssetGraph.JavaScriptCommonJsRequire(
                  from: this
                  to:
                    url: urlTools.fsFilePathToFileUrl(resolvedFileName)
                  node: node
                )
            else
              warnings.push new errors.SyntaxError(
                message: "Skipping JavaScriptCommonJsRequire (only supported from file: urls): #{node.print_to_string()}"
                relationType: 'JavaScriptCommonJsRequire'
              )
    ).bind(this))

    @parseTree.walk walker
    if syntaxErrors.length
      if @assetGraph
        syntaxErrors.forEach ((syntaxError) ->
          syntaxError.asset = this
          @assetGraph.emit 'error', syntaxError
        ), this
      else
        throw new Error(_.pluck(errors, 'message').join('\n'))
    if warnings.length
      warnings.forEach ((warning) ->
        if @assetGraph
          warning.asset = this
          @assetGraph.emit 'warn', warning
        else
          console.warn warning.message
      ), this
    return outgoingRelations

JavaScript::__defineSetter__ "text", Text::__lookupSetter__("text")

# Expose the right version of uglify-js and uglifyast so instanceof checks
# won't fail
JavaScript.uglifyJs = uglifyJs
JavaScript.uglifyAst = uglifyAst

module.exports = JavaScript
