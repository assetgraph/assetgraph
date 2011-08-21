var util = require('util'),
    _ = require('underscore'),
    iconv = require('iconv'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Asset = require('./Asset');


/**
 * @class Text
 * @extends Asset
 *
 * new Text(options)
 * =================
 *
 * Create a new Text asset instance.
 *
 * Adds text encoding and decoding support to Asset. Serves as a
 * superclass for `Html`, `Xml`, `Css`, `JavaScript`, `CoffeeScript`,
 * `Json`, and `CacheManifest`.
 *
 * In addition to the options already supported by the Asset base
 * class, these options are supported:
 *
 * - `text`     (String) The decoded source of the asset. Can be used
 *              instead of `rawSrc` and `rawSrcProxy`.
 * - `encoding` (String) Used to decode and reencode the `rawSrc`. Can
 *              be any encoding supported by the `iconv` module. Can
 *              be changed later using the `encoding`
 *              getter/setter. Defaults to "utf-8" (see the docs for
 *              `defaultEncoding` below).
 *
 * Example:
 *
 *     var textAsset = new Text({
 *         // "æøå" in iso-8859-1:
 *         rawSrc: new Buffer([0xe6, 0xf8, 0xe5]),
 *         encoding: "iso-8859-1"
 *     });
 *     textAsset.text; // "æøå" (decoded JavaScript string)
 *     textAsset.encoding = 'utf-8';
 *     textAsset.rawSrc; // <Buffer c3 a6 c3 b8 c3 a5>
 */
function Text(config) {
    if ('text' in config) {
        this._text = config.text;
        delete config.text;
    }
    if (config.encoding) {
        this._encoding = config.encoding;
        delete config.encoding;
    }
    Asset.call(this, config);
}

util.inherits(Text, Asset);

extendWithGettersAndSetters(Text.prototype, {
    /**
     * text.isText
     * ===========
     *
     * Property that's true for all Text instances. Avoids reliance on
     * the `instanceof` operator.
     */
    isText: true,

    /**
     * text.defaultEncoding
     * ====================
     *
     * The default encoding for the Text (sub)class. Used for decoding
     * the raw source when the encoding cannot be determined by other
     * means, such as a `Content-Type` header (when the asset was
     * fetched via http), or another indicator specific to the given
     * asset type (`@charset` for Css, `<meta
     * http-equiv="Content-Type" ...>` for Html).
     *
     * Factory setting is "utf-8", but you can override it by setting
     * `Text.prototype.defaultEncoding` to another value supported by
     * the `iconv` module.
     */
    defaultEncoding: 'utf-8',

    defaultExtension: '.txt',

    alternativeExtensions: ['.xtemplate'], // For Ext.XTemplate + one.getText

    contentType: 'text/plain',

    load: function (cb) {
        if ('_text' in this || this._parseTree) {
            process.nextTick(cb);
        } else {
            Asset.prototype.load.call(this, cb);
        }
    },

    /**
     * Text.encoding (getter/setter)
     * =============================
     *
     * Get or set the encoding (charset) used for re-encoding the raw
     * source of the asset. To affect the initial decoding of the
     * `rawSrc` option, provide the `encoding` option to the
     * constructor.
     */
    get encoding() {
        if (!this._encoding) {
            this._encoding = this.defaultEncoding;
        }
        return this._encoding;
    },

    set encoding(encoding) {
        if (encoding !== this.encoding) {
            var text = this.text; // Make sure this._text exists so the rawSrc is decoded before the original encoding is thrown away
            delete this._rawSrc;
            this._encoding = encoding;
            this.markDirty();
        }
    },

    get rawSrc() {
        if (!this._rawSrc) {
            if ('_text' in this || this._parseTree) {
                if (/^utf-?8$/i.test(this.encoding)) {
                    this._rawSrc = new Buffer(this.text);
                } else {
                    this._rawSrc = new iconv.Iconv('utf-8', this.encoding).convert(this.text);
                }
            } else {
                throw new Error("assets.Text.rawSrc getter: No _rawSrc or _text property found, asset not loaded?");
            }
        }
        return this._rawSrc;
    },

    set rawSrc(rawSrc) {
        this._rawSrc = rawSrc;
        delete this._parseTree;
        delete this._text;
        this.markDirty();
    },

    /**
     * text.text (getter/setter)
     * =========================
     *
     * Get or set the decoded text (JavaScript string) of the asset.
     *
     * If the internal state has been changed since the asset was
     * initialized, it will automatically be reserialized when this
     * property is retrieved, for example:
     *
     *     var htmlAsset = new Html({
     *         rawSrc: new Buffer("<body>hello</body>");
     *     });
     *     htmlAsset.text; // "<body>hello</body>"
     *     htmlAsset.parseTree.body.innerHTML = "bye";
     *     htmlAsset.markDirty();
     *     htmlAsset.text; // "<body>bye</body>"
     *
     * Setting this property after the outgoing relations have been
     * accessed currently leads to undefined behavior.
     */
    get text() {
        if (!('_text' in this)) {
            this._text = this._getTextFromRawSrc();
        }
        return this._text;
    },

    set text(text) {
        this._text = text;
        delete this._rawSrc;
        delete this._parseTree;
        this.markDirty();
    },

    markDirty: function () {
        if (this._parseTree) {
            delete this._text;
        }
        Asset.prototype.markDirty.call(this);
    },

    _getTextFromRawSrc: function () {
        if (!this._rawSrc) {
            throw new Error("assets.Text._getTextFromRawSrc(): No _rawSrc property found.");
        }
        if (/^utf-?8$/i.test(this.encoding)) {
            return this._rawSrc.toString('utf-8');
        } else {
            return new iconv.Iconv(this.encoding, 'utf-8').convert(this._rawSrc).toString('utf-8');
        }
    },

    // More efficient than Asset._clone for text-based assets:
    _clone: function () {
        return new this.constructor({
            encoding: this.encoding,
            text: this.text
        });
    }
});

module.exports = Text;
