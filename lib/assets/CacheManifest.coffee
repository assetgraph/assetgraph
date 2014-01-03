_ = require("underscore")
errors = require("../errors")
AssetGraph = require("../")
Text = require("./Text")

Function::property = (prop, desc) ->
  Object.defineProperty @prototype, prop, desc

class CacheManifest extends Text
  contentType: 'text/cache-manifest'
  supportedExtensions: ['.appcache']

  @property 'parseTree',
    get: ->
      unless @_parseTree
        parseTree = {}
        syntaxErrors = []
        currentSectionName = "CACHE"
        @text.split(/\r?\n|\n?\r/).forEach ((line, i) ->
          if i is 0
            if line is "CACHE MANIFEST"
              return # Skip
            else
              console.warn "Warning: First line of cache manifest wasn't CACHE MANIFEST"
          matchNewSection = line.match(/^(CACHE|NETWORK|FALLBACK):\s*$/)
          if matchNewSection
            currentSectionName = matchNewSection[1]
          else unless /^\s*$/.test(line)
            parseTree[currentSectionName] = []  unless currentSectionName of parseTree
            if /^\s*#/.test(line)
              parseTree[currentSectionName].push comment: line.replace(/^\s*#/, "")
            else
              tokens = line.replace(/^\s+|\s+$/g).split(" ") # Trim just in case
              node = undefined
              if tokens.length is ((if currentSectionName is "FALLBACK" then 2 else 1))
                parseTree[currentSectionName].push tokens: tokens
              else
                syntaxErrors.push new errors.SyntaxError(
                  message: "CacheManifest.parseTree getter: Parse error in section " + currentSectionName + ", line " + i + ": " + line
                  line: i
                )
        ), this
        if syntaxErrors.length > 0
          if @assetGraph
            syntaxErrors.forEach ((syntaxError) ->
              @assetGraph.emit "error", syntaxError
            ), this
          else
            throw new Error(_.pluck(syntaxErrors, "message").join("\n"))
        @_parseTree = parseTree
      @_parseTree
    set: (parseTree) ->
      @unload()
      @_parseTree = parseTree
      @markDirty()

  @property 'text',
    get: ->
      unless "_text" of this
        if @_parseTree
          getSectionText = (nodes) ->
            nodes.map((node) ->
              if "comment" of node
                "#" + node.comment
              else
                node.tokens.join " "
            ).join("\n") + "\n"
          @_text = "CACHE MANIFEST\n"
          
          # The heading for the CACHE section can be omitted if it's the first
          # thing in the manifest, so put it first if there is one.
          @_text += getSectionText(@_parseTree.CACHE)  if @_parseTree.CACHE
          _.each @_parseTree, ((nodes, sectionName) ->
            @_text += sectionName + ":\n" + getSectionText(nodes)  if sectionName isnt "CACHE" and nodes.length
          ), this
        else
          @_text = @_getTextFromRawSrc()
      @_text

  findOutgoingRelationsInParseTree: ->
    outgoingRelations = []
    
    # Traverse the sections in alphabetical order so the order of the relations is predictable
    Object.keys(@parseTree).sort().forEach ((sectionName) ->
      nodes = @parseTree[sectionName]
      if sectionName isnt "NETWORK"
        nodes.forEach ((node) ->
          if node.tokens
            
            # In the CACHE section there's only one token per entry, in FALLBACK
            # there's the online URL followed by the offline URL (the one we want).
            # Just pick the last token as the url.
            outgoingRelations.push new AssetGraph.CacheManifestEntry(
              from: this
              to:
                url: node.tokens[node.tokens.length - 1]

              node: node
              sectionName: sectionName
            )
        ), this
    ), this
    outgoingRelations

module.exports = CacheManifest
