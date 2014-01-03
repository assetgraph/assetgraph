path = require 'path'
EventEmitter = require('events').EventEmitter
crypto = require 'crypto'
_ = require 'underscore'
urlTools = require 'url-tools'
resolveDataUrl = require '../util/resolveDataUrl'
passError = require 'passerror'
setImmediate = process.nextTick if typeof setImmediate is 'undefined'

urlEndsWithSlashRegExp = /\/(?:[?#].*)?$/

Function::getter = (prop, get) ->
  Object.defineProperty @prototype, prop, {get, configurable: yes}

Function::setter = (prop, set) ->
  Object.defineProperty @prototype, prop, {set, configurable: yes}

Function::property = (prop, desc) ->
  Object.defineProperty @prototype, prop, desc

###*
 * An asset object represents a single node in an AssetGraph, but can be used
   and manipulated on its own outside the graph context.
###
class Asset extends EventEmitter
  ###*
   * Create a new Asset instance. Note that the Asset base class is only
     intended to be used to represent assets for which there's no specific
     subclass. Most of the time it's unnecessary to create asset objects
     directly. When you need to manipulate assets that already exist on disc
     or on a web server, the `loadAssets` and `populate` transforms are the
     easiest way to get the objects created. See the section about transforms
     below.
   * @param {Buffer} config.rawSrc Buffer containing the raw source of the
     asset. Mandatory unless the `rawSrcProxy` option is provided.
   * @param {Function} config.rawSrcProxy Function that provides the raw
     source of the asset to a callback (and optionally a metadata object), for
     example by loading it from disc or fetching it via http. Mandatory unless
     the `rawSrc` option is provided.
   * @param {String} [config.contentType] The Content-Type (MIME type) of the
     asset. For subclasses of Asset there will be a reasonable default. Can
     also be provided by the `rawSrcProxy` in the `metadata` object.
   * @param {String} [config.url] The fully qualified (absolute) url of the
     asset. If not provided, the asset will be considered inline. Can also be
     provided by the `rawSrcProxy` in the `metadata' object (think HTTP
     redirects).
   * @param {String} config.extension The desired file name extension of the
     asset. Will be extracted from the `url` option if possible, and in that
     case, the `extension` option will be ignored.
   * @param {String} config.fileName The desired file name of the asset. Will
     be extracted from the `url` option if possible, and in that case, the
     `fileName` option will be ignored. Takes precedence over the `extension`
     config option.
  ###
  constructor: (config) ->
    if 'lastKnownByteLength' of config
      @_lastKnownByteLength = config.lastKnownByteLength
      delete config.lastKnownByteLength
    if config.rawSrc
      @_updateRawSrcAndLastKnownByteLength config.rawSrc
      delete config.rawSrc
    if config.parseTree
      @_parseTree = config.parseTree
      delete config.parseTree
    if config.url
      @_url = config.url
      unless urlEndsWithSlashRegExp.test(@_url)
        pathname = urlTools.parse(@_url).pathname
        @_extension = path.extname(pathname)
        @_fileName = path.basename(pathname)
      delete config.url
    else
      if 'fileName' of config and ('_fileName' not of this)
        @_fileName = config.fileName
        @_extension = path.extname(@_fileName)
      delete config._fileName

      if 'extension' of config and ('_extension' not of this)
        @_extension = config.extension
      delete config.extension
    if config.outgoingRelations
      @_outgoingRelations = config.outgoingRelations.map((outgoingRelation) ->
        outgoingRelation.from = this
        outgoingRelation
      , this)
      delete config.outgoingRelations
    _.extend this, config
    @id = '' + _.uniqueId()

  ###*
   * Property that's true for all Asset instances. Avoids reliance on the
     `instanceof` operator.
   * @type {Boolean}
   * @public
  ###
  isAsset: true

  isResolved: true

  ###*
   * Whether the asset occurs in a context where it can be made external. If
     false, the asset will stay inline. Useful for "always inline" assets
     pointed to by HtmlConditionalComment, HtmlDataBindAttribute, and
     HtmlKnockoutContainerless relations. Override when creating the asset.
   * @type {Boolean}
  ###
  isExternalizable: true

  ###*
   * The Content-Type (MIME type) of the asset.
   * @type {String}
   * @public
  ###
  contentType: 'application/octet-stream'

  ###*
   * The default extension for the asset type.
   * @type {String}
   * @readOnly
   * @public
  ###
  @property 'defaultExtension',
    get: ->
      (@supportedExtensions and @supportedExtensions[0]) or ''

  ###*
   * Some asset classes support inspection and manipulation using a high level
     interface. If you modify the parse tree, you have to call
     `asset.markDirty()` so any cached serializations of the asset are
     invalidated.
   * These are the formats you'll get:
   * `Html` and `Xml`: jsdom document object
     (https://github.com/tmpvar/jsdom).
   * `Css`: CSSOM CSSStyleSheet object (https://github.com/NV/CSSOM).
   * `JavaScript`: UglifyJS AST object (https://github.com/mishoo/UglifyJS).
   * `Json`: Regular JavaScript object (the result of JSON.parse on the
     decoded source).
   * `CacheManifest`: A JavaScript object with a key for each section present
     in the manifest (`CACHE`, `NETWORK`, `REMOTE`). The value is an array
     with an item for each entry in the section. Refer to the source for
     details.
   * @type {Object}
   * @public
  ###
  parseTree: undefined

  ###*
   * Makes sure the asset is loaded, then calls the supplied callback. This is
     Asset's only async method, as soon as it is loaded, everything can happen
     synchronously. Usually you'll want to use `transforms.loadAssets`, which
     will handle this automatically.
   * @param {Function} cb The callback to invoke when the asset is loaded.
   * @public
  ###
  load: (cb) ->
    if @isLoaded
      setImmediate cb
    else if @rawSrcProxy
      @rawSrcProxy passError(cb, (rawSrc, metadata) =>
        @_updateRawSrcAndLastKnownByteLength rawSrc
        if metadata
          if metadata.encoding

            # Avoid recoding the asset, just set the encoding.
            @_encoding = metadata.encoding
            delete metadata.encoding
          _.extend this, metadata # Might change url, contentType and encoding, and could add etag, lastModified, and date
        delete @rawSrcProxy

        @emit 'load', this
        if @assetGraph
          # Make sure parse errors and the like are passed to cb:
          try
            @populate()
          catch e
            return cb(e)
        cb()
      )
    else
      setImmediate ->
        cb new Error('Asset.load: No rawSrc or rawSrcProxy found, cannot load')

  ###*
   * @readOnly
  ###
  @property 'isLoaded',
    get: ->
      '_rawSrc' of this or '_parseTree' of this or (@isText and '_text' of this)

  ###*
   * Get the first non-inline ancestor asset by following the incoming
     relations, ie. the first asset that has a url. Returns the asset itself
     if it's not inline, and null if the asset is inline, but not in an
     AssetGraph.
   * @readOnly
  ###
  @property 'nonInlineAncestor',
    get: ->
      if @isInline
        if @assetGraph
          incomingRelations = @incomingRelations
          if incomingRelations.length > 0
            return incomingRelations[0].from.nonInlineAncestor
        null
      else
        this

  ###*
   * The file name extension for the asset (String). It is automatically kept
     in sync with the url, but preserved if the asset is inlined or set to a
     value that ends with a slash.
   * If updated, the url of the asset will also be updated.
   * The extension includes the leading dot and is thus kept in the same
     format as `require('path').extname` and the `basename` command line
     utility use.
   * @return {String} The extension part of the url, eg. ".html" or ".css".
   * @public
  ###
  @property 'extension',
    get: ->
      if '_extension' of this
        @_extension
      else
        @defaultExtension

    set: (extension) ->
      unless @isInline
        @url = @url.replace(/(?:\.\w+)?([?#]|$)/, "#{extension}$1")
      else if '_fileName' of this
        if '_extension' of this
          @_fileName = path.basename(@_fileName, @_extension) + extension
        else
          @_fileName += extension
      @_extension = extension

  ###*
   * The file name for the asset (String). It is automatically kept in sync
     with the url, but preserved if the asset is inlined or set to a value
     that ends with a slash. If updated, the url of the asset will also be
     updated.
   * @return {String} The file name part of the url, eg. "foo.html" or
     "styles.css".
   * @public
  ###
  @property 'fileName',
    get: ->
      @_fileName  if '_fileName' of this

    set: (fileName) ->
      unless @isInline
        @url = @url.replace(/[^\/?#]*([?#]|$)/, "#{fileName}$1")
      @_extension = path.extname(fileName)
      @_fileName = fileName

  ###*
   * Get or set the raw source of the asset. If the internal state has been
     changed since the asset was initialized, it will automatically be
     reserialized when this property is retrieved.
   * @example
   * var htmlAsset = new AssetGraph.Html({
   *   rawSrc: new Buffer('<html><body>Hello!</body></html>')
   * });
   * htmlAsset.parseTree.body.innerHTML = "Bye!";
   * htmlAsset.markDirty();
   * htmlAsset.rawSrc.toString(); // "<html><body>Bye!</body></html>"
   * @return {Buffer} The raw source.
   * @public
  ###
  @property 'rawSrc',
    get: ->
      unless @_rawSrc
        err = new Error("Asset.rawSrc getter: Asset isn't loaded: #{@}")
        if @assetGraph
          @assetGraph.emit 'error', err
        else
          throw err
      @_rawSrc

    set: (rawSrc) ->
      @unload()
      @_updateRawSrcAndLastKnownByteLength rawSrc
      @populate() if @assetGraph
      @markDirty()

  _updateRawSrcAndLastKnownByteLength: (rawSrc) ->
    @_rawSrc = rawSrc
    @_lastKnownByteLength = rawSrc.length

  ###*
   * Doesn't force a serialization of the asset if a value has previously been
     recorded.
   * @readOnly
  ###
  @property 'lastKnownByteLength',
    get: ->
      if @_rawSrc
        @_rawSrc.length
      else if '_lastKnownByteLength' of this
        @_lastKnownByteLength
      else
        @rawSrc.length # Force the rawSrc to be computed

  ###*
   * Unload the asset body. If the asset is in a graph, also remove the
     relations from the graph along with any inline assets. Also used
     internally right to clean up before overwriting .rawSrc or .text.
  ###
  unload: ->
    # Remove inline assets and outgoing relations:
    if @assetGraph and @isPopulated
      @outgoingRelations.forEach ((outgoingRelation) ->
        @assetGraph.removeRelation outgoingRelation

        # Remove inline asset
        if outgoingRelation.to.isAsset and outgoingRelation.to.isInline
          @assetGraph.removeAsset outgoingRelation.to
      ), this

    delete @isPopulated
    delete @_outgoingRelations
    delete @_rawSrc
    delete @_text
    delete @_parseTree

  ###*
   * Get the current md5 hex of the asset.
   * @readOnly
  ###
  @property 'md5Hex',
    get: ->
      unless @_md5Hex
        @_md5Hex = crypto.createHash('md5').update(@rawSrc).digest('hex')
      @_md5Hex

  ###
   * Get or set the absolute url of the asset (String). The url will use the
     `file:` schema if loaded from disc. Will be falsy for inline assets.
   * @public
  ###
  @property 'url',
    get: ->
      @_url

    set: (url) ->
      unless @isExternalizable
        throw new Error("#{@toString()} cannot set url of non-externalizable asset")
      oldUrl = @_url
      if url and not /^[a-z\+]+:/.test(url)

        # Non-absolute
        baseUrl = oldUrl or (@assetGraph and @baseAsset and @baseAsset.nonInlineAncestor.url) or (@assetGraph and @assetGraph.root)
        if baseUrl
          if /^\/\//.test(url)

            # Protocol-relative
            url = urlTools.resolveUrl(baseUrl, url)
          else if /^\//.test(url)

            # Root-relative
            if /^file:/.test(baseUrl) and /^file:/.test(@assetGraph.root)
              url = urlTools.resolveUrl(@assetGraph.root, url.substr(1))
            else
              url = urlTools.resolveUrl(baseUrl, url)
          else

            # Relative
            url = urlTools.resolveUrl(baseUrl, url)
        else
          throw new Error("Cannot find base url for resolving new url of #{@urlOrDescription} to non-absolute: #{url}")
      if url isnt oldUrl
        @_url = url
        if url and not urlEndsWithSlashRegExp.test(url)
          pathname = urlTools.parse(url).pathname
          @_extension = path.extname(pathname)
          @_fileName = path.basename(pathname)
        if @assetGraph

          # Update the AssetGraph's indices
          if @assetGraph._relationsWithNoBaseAsset.length
            @assetGraph.recomputeBaseAssets()
          [].concat(@assetGraph._objInBaseAssetPaths[@id]).forEach ((affectedRelation) ->
            unless oldUrl

              # Un-inlining the asset, need to recompute all base asset paths
              # it's a member of:
              affectedRelation._unregisterBaseAssetPath()
              affectedRelation._registerBaseAssetPath()
            if affectedRelation.baseAsset is this
              affectedRelation.refreshHref()
          ), this
          @assetGraph.findRelations(to: this).forEach ((incomingRelation) ->
            incomingRelation.refreshHref()
          ), this

  ###*
   * Determine whether the asset is inline (shorthand for checking whether it
     has a url).
   * @return {Boolean} Whether the asset is inline.
   * @readOnly
  ###
  @property 'isInline',
    get: ->
      not @url

  ###*
   * Sets the `dirty` flag of the asset, which is the way to say that the
     asset has been manipulated since it was first loaded (read from disc or
     loaded via http). For inline assets the flag is set if the asset has been
     manipulated since it was last synchronized with (copied into) its
     containing asset.
   * For assets that support a `text` or `parseTree` property, calling
     `markDirty()` will invalidate any cached serializations of the asset.
   * @return {Asset} The asset itself (chaining-friendly).
   * @public
  ###
  markDirty: ->
    @isDirty = true
    delete @_rawSrc  if '_text' of this or '_parseTree' of this
    delete @_md5Hex

    if @isInline and @assetGraph

      # Cascade dirtiness to containing asset and re-inline
      if @incomingRelations.length > 1
        throw new Error("Asset.markDirty assertion error: Expected a maximum of one incoming relation to inline asset, but found #{@incomingRelations.length}")
      else @incomingRelations[0].inline() if @incomingRelations.length is 1
    this

  ###*
   * Get the outgoing relations of the asset. Only supported by a few
     subclasses (`Css`, `Html`, `CacheManifest`, and `JavaScript`), all others
     return an empty array.
   * If the asset is part of an AssetGraph, it will be queried for the
     relations, otherwise the parse tree will be traversed.
   * @return {Array[Relation]} The outgoing relations.
   * @public
   * @readOnly
  ###
  @property 'outgoingRelations',
    get: ->
      if @assetGraph and @isPopulated
        return @assetGraph.findRelations(
          from: this
        , true)
      unless @_outgoingRelations
        @_outgoingRelations = @findOutgoingRelationsInParseTree()
      @_outgoingRelations

  findOutgoingRelationsInParseTree: ->
    []

  ###*
   * Get the relations pointing at this asset. Only supported if the asset is
     part of an AssetGraph.
   * @return {Array[Relation]} The incoming relations.
   * @public
   * @readOnly
  ###
  @property 'incomingRelations',
    get: ->
      unless @assetGraph
        throw new Error('Asset.incomingRelations getter: Asset is not part of an AssetGraph')
      @assetGraph.findRelations to: this

  ###*
   * Go through the outgoing relations of the asset and add the ones that
     refer to assets that are already part of the graph. Recurses into inline
     assets. You shouldn't need to call this manually.
   * @param {Asset} asset The asset.
   * @return {Asset} The asset itself.
   * @chainable
   * @public
  ###
  populate: ->
    unless @assetGraph
      throw new Error('Asset.populateRelationsToExistingAssets: Asset is not part of an AssetGraph')
    if @isLoaded and not @keepUnpopulated and not @isPopulated
      @outgoingRelations.forEach ((outgoingRelation) ->
        unless outgoingRelation.assetGraph
          if outgoingRelation.to.url or typeof outgoingRelation.to is 'string'

            # See if the target asset is already in the graph by looking up
            # its url:
            relativeUrl = outgoingRelation.to.url or outgoingRelation.to
            if /^data:/.test(relativeUrl)
              assetConfig = resolveDataUrl(relativeUrl)
              if assetConfig
                assetConfig.type = @assetGraph.lookupContentType(
                  assetConfig.contentType
                )
                outgoingRelation.to = @assetGraph.createAsset(assetConfig)
                @assetGraph.addAsset outgoingRelation.to
            else
              baseAsset = outgoingRelation.baseAsset
              if baseAsset
                baseAssetUrl = baseAsset.nonInlineAncestor.url
                targetUrl = @assetGraph.resolveUrl(baseAssetUrl, relativeUrl)
                targetAssets = @assetGraph.findAssets(url: targetUrl)

                # If multiple assets share the url, prefer the one that was
                # added last (should be customizable?):
                if targetAssets.length
                  outgoingRelation.to = targetAssets[targetAssets.length - 1]
            @assetGraph.addRelation outgoingRelation
          else

            # Inline asset
            @assetGraph.addRelation outgoingRelation
            unless outgoingRelation.to.assetGraph
              @assetGraph.addAsset outgoingRelation.to
      ), this
      @isPopulated = true

  ###*
   * Replace the asset in the graph with another asset, then remove it from
     the graph.
   * Updates the incoming relations of the old asset to point at the new one
     and preserves the url of the old asset if it's not inline.
   * @param {Asset} newAsset The asset to put replace this one with.
   * @return {Asset} The new asset.
   * @public
  ###
  replaceWith: (newAsset) ->
    if not @assetGraph or (@id not of @assetGraph.idIndex)
      throw new Error("asset.replaceWith: Current asset isn't in a graph: #{this}")
    if not newAsset or not newAsset.isAsset
      throw new Error("asset.replaceWith: newAsset is not an asset: #{newAsset}")
    if newAsset.id of @assetGraph.idIndex
      throw new Error("asset.replaceWith: New asset is already in the graph: #{newAsset}")
    @incomingRelations.forEach ((incomingRelation) ->
      incomingRelation.to = newAsset
      incomingRelation.refreshHref()
    ), this
    @assetGraph.addAsset newAsset
    @assetGraph.removeAsset this
    newAsset.url = @url  if @url and not newAsset.url
    newAsset

  ###*
   * Clone this asset instance and add the clone to the graph if this instance
     is part of a graph. As an extra service, optionally update some caller-
     specified relations to point at the clone. If this instance isn't inline,
     a url is made up for the clone.
   * @param {Array[Relation]|Relation} [incomingRelations] Some incoming
     relations that should be pointed at the clone.
   * @return {Asset} The cloned asset.
   * @public
  ###
  clone: (incomingRelations, preserveUrl) ->
    if incomingRelations and not @assetGraph
      throw new Error('asset.clone(): incomingRelations not supported because asset isn\'t in a graph')

    # TODO: Clone more metadata
    constructorOptions =
      isInitial: @isInitial
      extension: @extension
      lastKnownByteLength: @lastKnownByteLength

    constructorOptions.url = @url if preserveUrl and not @isInline
    if @isText
      # Cheaper than encoding + decoding
      constructorOptions.text = @text
    else
      constructorOptions.rawSrc = @rawSrc

    # FIXME: Belongs in the subclass
    if @_isFragment?
      constructorOptions._isFragment = @_isFragment
    if @type is 'JavaScript'
      # FIXME: Belongs in the subclass
      if @initialComments
        constructorOptions.initialComments = @initialComments
      constructorOptions.quoteChar = @quoteChar if @quoteChar
    clone = new @constructor(constructorOptions)
    if not preserveUrl and not @isInline
      clone.url = urlTools.resolveUrl(@url, clone.id + @extension)
    if @assetGraph
      if incomingRelations
        incomingRelations = [incomingRelations] if incomingRelations.isRelation
        incomingRelations.forEach ((incomingRelation) ->
          if not incomingRelation or not incomingRelation.isRelation
            throw new Error('asset.clone(): Incoming relation is not a relation: ', incomingRelation)
          if incomingRelation.id of @assetGraph.idIndex
            incomingRelation.to = clone
          else
            incomingRelation.to = clone
            @assetGraph.addRelation incomingRelation # Hmm, what about position and adjacentRelation?
          incomingRelation.refreshHref()
        ), this
      clone.baseAssetSubstitute = this
      @assetGraph.addAsset clone
      delete clone.baseAssetSubstitute
    clone

  ###*
   * Get a brief text containing the type, id, and url (if not inline) of the
     asset.
   * @return {String} The string, eg. "[JavaScript/141 file:///the/thing.js]"
   * @public
  ###
  toString: ->
    "[#{@type}/#{@id}#{if @url then " #{@url}" else ''}]"

  ###*
   * @readOnly
  ###
  @property 'urlOrDescription',
    get: ->
      @url or ("inline #{@type}#{if @nonInlineAncestor then " in #{@nonInlineAncestor.url}" else ''}")

module.exports = Asset
