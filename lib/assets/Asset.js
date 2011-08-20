/*global module, require*/
var EventEmitter = require('events').EventEmitter,
    path = require('path'),
    util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    passError = require('../util/passError'),
    uniqueId = require('../util/uniqueId'),
    urlEndsWithSlashRegExp = /\/(?:[?#].*)?$/;

/**
 * @class Asset
 * @extends EventEmitter
 *
 * new Asset(options)
 * ==================
 *
 * Create a new Asset instance.
 *
 * Note that this class is only intended to be used for asset types
 * for which there's no specific subclass.
 *
 * Options:
 *
 *  - `rawSrc`      `Buffer` object containing the raw source of the asset.
 *                  Mandatory unless the `rawSrcProxy` option is provided.
 *  - `rawSrcProxy` Function that provides the raw source of the asset
 *                  to a callback (and optionally a metadata object) ,
 *                  for example by loading it from disc or fetching it
 *                  via http. Mandatory unless the `rawSrc` option is
 *                  provided.
 *  - `contentType` (optional) The Content-Type (MIME type) of the asset.
 *                  For subclasses of Asset there will be a reasonable
 *                  default. Can also be provided by the `rawSrcProxy`
 *                  in the `metadata` object.
 *  - `url`         (optional) The fully qualified (absolute) url of the
 *                  asset. If not provided, the asset will be considered
 *                  inline. Can also be provided by the `rawSrcProxy`
 *                  in the `metadata' object (think HTTP redirects).
 */
function Asset(config) {
    EventEmitter.call(this);
    if (config.rawSrc) {
        this._rawSrc = config.rawSrc;
        delete config.rawSrc;
    }
    if (config.parseTree) {
        this._parseTree = config.parseTree;
        delete config.parseTree;
    }
    if (config.url) {
        this._url = config.url;
        delete config.url;
    }
    if (config.outgoingRelations) {
        this._outgoingRelations = config.outgoingRelations;
        delete config.outgoingRelations;
    }
    _.extend(this, config);
    this.id = uniqueId();
    if (this.url && !urlEndsWithSlashRegExp.test(this.url)) {
        this.originalExtension = path.extname(this.url.replace(/[?#].*$/, ''));
    }
}

util.inherits(Asset, EventEmitter);

extendWithGettersAndSetters(Asset.prototype, {
    /**
     * asset.isAsset
     * =============
     *
     * {Boolean} Property that's true for all Asset instances. Avoids
     * reliance on the `instanceof` operator.
     *
     * @api public
     */
    isAsset: true,

    /**
     * asset.contentType
     * =================
     *
     * {String} The Content-Type (MIME type) of the asset.
     *
     * @api public
     */
    contentType: 'application/octet-stream',

    /**
     * asset.defaultExtension
     * ======================
     *
     * {String} The default extension for the asset type.
     */
    defaultExtension: '',

    /**
     * load(cb)
     * ========
     *
     * Makes sure the asset is loaded, then calls the supplied
     * callback. This is Asset's only async method, as soon as it is
     * loaded, everything can happen synchronously.
     *
     * @param {Function} cb The callback to invoke when the asset is
     * loaded.
     */
    load: function (cb) {
        var that = this;
        if (that._rawSrc || that._parseTree) {
            process.nextTick(cb);
        } else if (that.rawSrcProxy) {
            that.rawSrcProxy(passError(cb, function (rawSrc, metadata) {
                that._rawSrc = rawSrc;
                if (metadata) {
                    _.extend(this, metadata); // Might change url, contentType and encoding
                }
                delete that.rawSrcProxy;
                cb();
            }));
        } else {
            process.nextTick(function () {
                cb(new Error("assets.Asset.load: No rawSrc or rawSrcProxy found, cannot load"));
            });
        }
    },

    /**
     * asset.extension (getter)
     * ========================
     *
     * {String} A suitable extension for the asset. If the asset has a
     * url (because it isn't inline), the extension is extracted from
     * the url. If the asset had a url when it was loaded, the
     * extension will be extracted from that. Otherwise, the default
     * extension (the `defaultExtension` property) for the class will
     * be returned.
     *
     * @return {String} The extension (includes the leading dot).
     */
    get extension() {
        if (this.url && !urlEndsWithSlashRegExp.test(this.url)) {
            return path.extname(this.url.replace(/[?#].*$/, ''));
        } else if ('originalExtension' in this) {
            return this.originalExtension;
        } else {
            return this.defaultExtension;
        }
    },

    /**
     * asset.rawSrc (getter)
     * =====================
     *
     * Get the raw source of the asset.
     *
     * @return {Buffer} The raw source.
     */
    get rawSrc() {
        if (!this._rawSrc) {
            throw new Error("assets.Asset.rawSrc getter: Asset isn't loaded");
        }
        return this._rawSrc;
    },

    /**
     * asset.rawSrc = <buffer> (setter)
     * ================================
     *
     * Sets the raw source of an asset. This currently leads to
     * undefined behavior if the outgoing relations of the asset have
     * been accessed.
     *
     * @param {Buffer} rawSrc The raw source to set.
     * @api public
     */
    set rawSrc(rawSrc) {
        this._rawSrc = rawSrc;
        this.markDirty();
    },

    /**
     * asset.url (getter)
     * ==================
     *
     * Get the url of the asset.
     *
     * @return {String} The url, or a falsy value if the asset is
     * inline.
     */
    get url() {
        return this._url;
    },

    /**
     * asset.url = url (setter)
     * ========================
     *
     * Set the url (String) of the asset.
     *
     * Causes the asset to emit the `setUrl` event with the asset
     * object, the new url, and the old url as parameters, in that
     * order.
     *
     * @param {String} url The new url.
     */
    set url(url) {
        var oldUrl = this._url;
        this._url = url;
        this.emit('setUrl', this, url, oldUrl);
    },

    /**
     * asset.isInline (getter)
     * =======================
     *
     * Determine whether the asset is inline (shorthand for checking
     * whether it has a url).
     *
     * @return {Boolean} Whether the asset is inline.
     */
    get isInline() {
        return !this.url;
    },

    /**
     * asset.markDirty()
     * =================
     *
     * Sets the `dirty` flag of the asset, which is the way to say
     * that the asset has been manipulated since it was first loaded
     * (read from disc or loaded via http). For inline assets the flag
     * is set if the asset has been manipulated since it was last
     * synchronized with (copied into) its containing asset.
     *
     * For assets that support a `text` or `parseTree` property, calling
     * `markDirty()` will invalidate any cached serializations of the
     * asset,
     */
    markDirty: function () {
        this.isDirty = true;
        delete this._rawSrc; // Hmm, this doesn't make sense for assets.Asset, now does it?
        this.emit('dirty', this);
    },

    /**
     * asset.outgoingRelations (getter)
     * ================================
     *
     * Get the outgoing relations of the asset. Only supported by a
     * few subclasses (`Css`, `Html`, `CacheManifest`, and
     * `JavaScript`), all others return an empty array.
     *
     * @return {Array[Relation]} The outgoing relations.
     */
    get outgoingRelations() {
        if (!this._outgoingRelations) {
            this._outgoingRelations = [];
        }
        return this._outgoingRelations;
    },

    /**
     * asset._clone()
     * ==============
     *
     * Get a clone of the asset. Doesn't take dirty inline relations
     * into account. You probably want to use `AssetGraph.cloneAsset`
     * instead.
     *
     * @return {Asset} The cloned asset.
     * @api private
     */
    _clone: function () {
        return new this.constructor({
            rawSrc: this.rawSrc
        });
    },

    /**
     * asset.toString()
     * ================
     *
     * Get a brief text containing the type, id, and url (if not inline) of the asset.
     *
     * @return {String} The string, eg. "[JavaScript/141 file:///the/thing.js]"
     */
    toString: function () {
        return "[" + this.type + "/" + this.id + (this.url ? " " + this.url : "") + "]";
    }
});

module.exports = Asset;
