/**
 * @class Asset
 * @extends EventEmitter
 *
 * An asset object represents a single node in an AssetGraph, but can
 * be used and manipulated on its own outside the graph context.
 */
var EventEmitter = require('events').EventEmitter,
    path = require('path'),
    util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    passError = require('../util/passError'),
    uniqueId = require('../util/uniqueId'),
    urlEndsWithSlashRegExp = /\/(?:[?#].*)?$/;

/**
 * new Asset(options)
 * ==================
 *
 * Create a new Asset instance.
 *
 * Most of the time it's unnecessary to create asset objects
 * directly. When you need to manipulate assets that already exist on
 * disc or on a web server, the `loadAssets` and `populate` transforms
 * are the easiest way to get the objects created. See the section about
 * transforms below.
 *
 * Note that the Asset base class is only intended to be used to
 * represent assets for which there's no specific subclass.
 *
 * Options:
 *
 *  - `rawSrc`      `Buffer` object containing the raw source of the asset.
 *                  Mandatory unless the `rawSrcProxy` option is provided.
 *  - `rawSrcProxy` Function that provides the raw source of the asset
 *                  to a callback (and optionally a metadata object),
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
 *  - `extension`   The desired file name extension of the asset. Will
 *                  be extracted from the `url` option if possible, and in
 *                  that case, the `extension` option will be ignored.
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
        if (!urlEndsWithSlashRegExp.test(this._url)) {
            this._extension = path.extname(this.url.replace(/[?#].*$/, ''));
        }
        delete config.url;
    } else if (config.extension) {
        if (!this._extension) {
            this._extension = config.extension;
        }
        delete config.extension;
    }
    if (config.outgoingRelations) {
        this._outgoingRelations = config.outgoingRelations;
        delete config.outgoingRelations;
    }
    _.extend(this, config);
    this.id = uniqueId();
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
     * asset.parseTree (getter)
     * ========================
     *
     * Some asset classes support inspection and manipulation using a high
     * level interface. If you modify the parse tree, you have to call
     * `asset.markDirty()` so any cached serializations of the asset are
     * invalidated.
     *
     * These are the formats you'll get:
     *
     * `assets.Html` and `assets.Xml`:
     *     `jsdom <https://github.com/tmpvar/jsdom>`_ document object.
     *
     * `assets.Css`
     *     `CSSOM <https://github.com/NV/CSSOM>`_ CSSStyleSheet object.
     *
     * `assets.JavaScript`
     *     `UglifyJS <https://github.com/mishoo/UglifyJS>`_ AST object.
     *
     * `assets.Json`
     *     Regular JavaScript object (the result of JSON.parse on the decoded source).
     *
     * `assets.CacheManifest`
     *     A JavaScript object with a key for each section present in the
     *     manifest (`CACHE`, `NETWORK`, `REMOTE`). The value is an array with
     *     an item for each entry in the section. Refer to the source for
     *     details.
     *
     * @api public
     */

    /**
     * asset.load(cb)
     * ==============
     *
     * Makes sure the asset is loaded, then calls the supplied
     * callback. This is Asset's only async method, as soon as it is
     * loaded, everything can happen synchronously.
     *
     * Usually you'll want to use `transforms.loadAssets`, which will
     * handle this automatically.
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
                    _.extend(that, metadata); // Might change url, contentType and encoding, and could add etag, lastModified, and date
                }
                delete that.rawSrcProxy;
                cb();
            }));
        } else {
            process.nextTick(function () {
                cb(new Error("Asset.load: No rawSrc or rawSrcProxy found, cannot load"));
            });
        }
    },

    /**
     * asset.extension (getter/setter)
     * ===============================
     *
     * The file name extension for the asset (String). It is
     * automatically kept in sync with the url, but preserved if the
     * asset is inlined or set to a value that ends with a slash.
     *
     * If updated, the url of the asset will also be updated.
     *
     * The extension includes the leading dot and is thus kept in the
     * same format as `require('path').extname` and the `basename`
     * command line utility use.
     *
     * @return {String} The extension, eg. ".html" or ".css".
     */
    get extension() {
        if ('_extension' in this) {
            return this._extension;
        } else {
            return this.defaultExtension;
        }
    },

    set extension(extension) {
        this._extension = extension;
        if (this.url) {
            this.url = this.url.replace(/(?:\.\w+)?([?#]|$)/, this._extension + "$1");
        }
    },

    /**
     * asset.rawSrc (getter/setter)
     * ============================
     *
     * Get or set the raw source of the asset.
     *
     * If the internal state has been changed since the asset was
     * initialized, it will automatically be reserialized when this
     * property is retrieved, for example:
     *
     *     var htmlAsset = new assets.Html({
     *         rawSrc: new Buffer('<html><body>Hello!</body></html>')
     *     });
     *     htmlAsset.parseTree.body.innerHTML = "Bye!";
     *     htmlAsset.markDirty();
     *     htmlAsset.rawSrc.toString(); // "<body>Bye!</body>"
     *
     * Setting this property after the outgoing relations have been
     * accessed currently leads to undefined behavior.
     *
     * @return {Buffer} The raw source.
     */
    get rawSrc() {
        if (!this._rawSrc) {
            throw new Error("Asset.rawSrc getter: Asset isn't loaded");
        }
        return this._rawSrc;
    },

    set rawSrc(rawSrc) {
        this._rawSrc = rawSrc;
        this.markDirty();
    },

    /**
     * asset.url (getter/setter)
     * =========================
     *
     * Get or set the absolute url of the asset (String).
     *
     * The url will use the file: schema if loaded from disc. Will be
     * falsy for inline assets.
     *
     * Setting the url causes the asset to emit the `setUrl` event
     * with the asset object, the new url, and the old url as
     * parameters, in that order. It will also update the `extension`
     * property if one can be extracted from the new url.
     */
    get url() {
        return this._url;
    },

    set url(url) {
        var oldUrl = this._url;
        this._url = url;
        this.emit('setUrl', this, url, oldUrl);
        if (this.assetGraph) {
            this.assetGraph._updateUrlIndex(this, url, oldUrl);
        }

        if (url && !urlEndsWithSlashRegExp.test(url)) {
            var extension = path.extname(this.url.replace(/[?#].*$/, ''));
            if (extension) {
                this._extension = extension;
            }
        }
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
     * asset.
     */
    markDirty: function () {
        this.isDirty = true;
        delete this._rawSrc; // Hmm, this doesn't make sense for assets.Asset, now does it?
        if (this.isInline && this.assetGraph) {
            // Cascade dirtiness to containing asset and re-inline
            if (this.incomingRelations.length !== 1) {
                throw new Error("Asset.markDirty assertion error: Expected exactly one incoming relation to inline asset, but found " + this.incomingRelations.length);
            }
            this.incomingRelations[0]._inline();
            this.incomingRelations[0].from.markDirty();
        }
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
     * asset.incomingRelations (getter)
     * ================================
     *
     * Get the relations pointing at this asset.
     *
     * @api public
     */
    get incomingRelations() {
        if (!this.assetGraph) {
            throw new Error("Asset.incomingRelations getter: Asset is not part of an AssetGraph");
        }
        return this.assetGraph.findRelations({to: this});
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
