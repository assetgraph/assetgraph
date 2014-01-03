util = require("util")
_ = require("underscore")
extendWithGettersAndSetters = require("../util/extendWithGettersAndSetters")
Asset = require("./Asset")
iconv = undefined

try
  iconv = require("iconv")

###
new Text(options)
=================

Create a new Text asset instance.

Adds text encoding and decoding support to Asset. Serves as a
superclass for `Html`, `Xml`, `Css`, `JavaScript`, `CoffeeScript`,
`Json`, and `CacheManifest`.

In addition to the options already supported by the Asset base
class, these options are supported:

- `text` (String) The decoded source of the asset. Can be used
instead of `rawSrc` and `rawSrcProxy`.  - `encoding`
(String) Used to decode and reencode the `rawSrc`. Can
be any encoding supported by the `iconv` module. Can
be changed later using the `encoding`
getter/setter. Defaults to "utf-8" (see the docs for
`defaultEncoding` below). If the asset is loaded via
http, the encoding will be read from the
`Content-Type`, and likewise for `data:` urls.

Example:

var textAsset = new Text({
// "æøå" in iso-8859-1:
rawSrc: new Buffer([0xe6, 0xf8, 0xe5]),
encoding: "iso-8859-1"
});
textAsset.text; // "æøå" (decoded JavaScript string)
textAsset.encoding = 'utf-8';
textAsset.rawSrc; // <Buffer c3 a6 c3 b8 c3 a5>
###
class Text extends Asset
  constructor: (config) ->
    if "text" of config
      @_text = config.text
      delete config.text
    if config.encoding
      @_encoding = config.encoding
      delete config.encoding
    super config

  ###
  text.isText
  ===========

  Property that's true for all Text instances. Avoids reliance on
  the `instanceof` operator.
  ###

  ###
  text.defaultEncoding
  ====================

  The default encoding for the Text (sub)class. Used for decoding
  the raw source when the encoding cannot be determined by other
  means, such as a `Content-Type` header (when the asset was
  fetched via http), or another indicator specific to the given
  asset type (`@charset` for Css, `<meta
  http-equiv="Content-Type" ...>` for Html).

  Factory setting is "utf-8", but you can override it by setting
  `Text.prototype.defaultEncoding` to another value supported by
  the `iconv` module.
  ###
  defaultEncoding: 'utf-8'

  supportedExtensions: [
    '.txt',
    '.htaccess',
    '.md',
    '.rst',
    '.ics',
    '.csv',
    '.tsv',
    '.xtemplate' # For Ext.XTemplate + GETTEXT
  ]

  contentType: 'text/plain'

  ###
  Text.encoding (getter/setter)
  =============================

  Get or set the encoding (charset) used for re-encoding the raw
  source of the asset. To affect the initial decoding of the
  `rawSrc` option, provide the `encoding` option to the
  constructor.
  ###
  @getter 'encoding', ->
    @_encoding = @defaultEncoding  unless @_encoding
    @_encoding

  @setter 'encoding', (encoding) ->
    if encoding isnt @encoding
      text = @text # Make sure this._text exists so the rawSrc is decoded before the original encoding is thrown away
      delete @_rawSrc

      @_encoding = encoding
      @markDirty()

  @getter 'rawSrc', ->
    unless @_rawSrc
      if "_text" of this or @_parseTree
        if /^utf-?8$/i.test(@encoding)
          @_updateRawSrcAndLastKnownByteLength new Buffer(@text, "utf-8")
        else if /^(?:us-?)?ascii$/i.test(@encoding)
          @_updateRawSrcAndLastKnownByteLength new Buffer(@text, "ascii")
        else if iconv
          try
            @_updateRawSrcAndLastKnownByteLength new iconv.Iconv("utf-8", @encoding).convert(@text)
          catch err
            err.message = "iconv: Converting " + @url + " from UTF-8 to " + @encoding + " failed:\n" + err.message
            if @assetGraph
              if err.code is "EILSEQ"
                err.message += "\nTransliterating and ignoring further failures. Data corruption may occur."
                @_updateRawSrcAndLastKnownByteLength new iconv.Iconv("utf-8", @encoding + "//TRANSLIT//IGNORE").convert(@text)
              @assetGraph.emit "error", err
            else
              throw err
        else
          throw new Error("node-iconv not found. Cannot encode " + this + " as " + @encoding + ". " + "Please run 'npm install iconv' and try again")
      else
        throw new Error("Text.rawSrc getter: No _rawSrc or _text property found, asset not loaded?")
    @_rawSrc

  @setter 'rawSrc', (rawSrc) ->
    assetGraph = @assetGraph
    assetGraph.removeAsset this  if assetGraph
    @_updateRawSrcAndLastKnownByteLength rawSrc
    delete @_parseTree
    delete @_text

    assetGraph.addAsset this  if assetGraph
    @markDirty()

  ###
  text.text (getter/setter)
  =========================

  Get or set the decoded text contents of the of the asset as a
  JavaScript string. Unlike browsers AssetGraph doesn't try to
  sniff the charset of your text-based assets. It will fall back
  to assuming utf-8 if it's unable to determine the
  encoding/charset from HTTP headers, `<meta
  http-equiv='Content-Type'>` tags (Html), `@charset` (Css), so
  if for some reason you're not using utf-8 for all your
  text-based assets, make sure to provide those hints. Other
  asset types provide no standard way to specify the charset
  within the file itself, so presently there's no way to load
  eg. JavaScript from disc if it's not utf-8 or ASCII, except by
  overriding `Text.prototype.defaultEncoding` globally.

  If the internal state has been changed since the asset was
  initialized, it will automatically be reserialized when the
  `text` property is retrieved, for example:

  var htmlAsset = new Html({
  rawSrc: new Buffer("<body>hello</body>");
  });
  htmlAsset.text; // "<body>hello</body>"
  htmlAsset.parseTree.body.innerHTML = "bye";
  htmlAsset.markDirty();
  htmlAsset.text; // "<body>bye</body>"

  Setting this property after the outgoing relations have been
  accessed currently leads to undefined behavior.
  ###
  @getter 'text', ->
    @_text = @_getTextFromRawSrc() unless "_text" of this
    @_text

  @setter 'text', (text) ->
    @unload()
    @_text = text
    @populate() if @assetGraph
    @markDirty()

  markDirty: ->
    delete @_text if @_parseTree
    super()

  _getTextFromRawSrc: ->
    throw new Error("Text._getTextFromRawSrc(): Asset not loaded: " + @urlOrDescription)  unless @isLoaded
    throw new Error("Text._getTextFromRawSrc(): No _rawSrc property found: " + @urlOrDescription)  unless @_rawSrc
    if /^utf-?8$/i.test(@encoding)
      @_rawSrc.toString "utf-8"
    else if /^(?:us-?)?ascii$/i.test(@encoding)
      @_rawSrc.toString "ascii"
    else if iconv
      new iconv.Iconv(@encoding, "utf-8").convert(@_rawSrc).toString "utf-8"
    else
      throw new Error("node-iconv not found. Cannot decode " + this + " (encoding is " + @encoding + "). " + "Please run 'npm install iconv' and try again")

module.exports = Text
