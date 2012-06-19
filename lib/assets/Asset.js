/**
 * @class Asset
 *
 * An asset object represents a single node in an AssetGraph, but can
 * be used and manipulated on its own outside the graph context.
 */
var path = require('path'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    crypto = require('crypto'),
    _ = require('underscore'),
    urlTools = require('../util/urlTools'),
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
 *  - `fileName`    The desired file name of the asset. Will
 *                  be extracted from the `url` option if possible, and in
 *                  that case, the `fileName` option will be ignored.
 *                  Takes precedence over the `extension` config option.
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
            var pathname = urlTools.parse(this._url).pathname;
            this._extension = path.extname(pathname);
            this._fileName = path.basename(pathname);
        }
        delete config.url;
    } else {
        if ('fileName' in config && !('_fileName' in this)) {
            this._fileName = config.fileName;
            this._extension = path.extname(this._fileName);
        }
        delete config._fileName;
        if ('extension' in config && !('_extension' in this)) {
            this._extension = config.extension;
        }
        delete config.extension;
    }
    if (config.outgoingRelations) {
        this._outgoingRelations = config.outgoingRelations.map(function (outgoingRelation) {
            outgoingRelation.from = this;
            return outgoingRelation;
        }, this);
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

    isResolved: true,

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
     *
     * @api public
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
     *     jsdom document object (https://github.com/tmpvar/jsdom).
     *
     * `assets.Css`
     *     CSSOM CSSStyleSheet object (https://github.com/NV/CSSOM).
     *
     * `assets.JavaScript`
     *     UglifyJS AST object (https://github.com/mishoo/UglifyJS).
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
     * @param {Function} cb The callback to invoke when the asset is loaded.
     * @api public
     */
    load: function (cb) {
        var that = this;
        if (that.isLoaded) {
            process.nextTick(cb);
        } else if (that.rawSrcProxy) {
            that.rawSrcProxy(passError(cb, function (rawSrc, metadata) {
                that._rawSrc = rawSrc;
                if (metadata) {
                    _.extend(that, metadata); // Might change url, contentType and encoding, and could add etag, lastModified, and date
                }
                delete that.rawSrcProxy;
                that.emit('load', that);
                if (that.assetGraph) {
                    // Make sure that parse errors and the like are passed to cb:
                    try {
                        that.populate();
                    } catch (e) {
                        return cb(e);
                    }
                }
                cb();
            }));
        } else {
            process.nextTick(function () {
                cb(new Error("Asset.load: No rawSrc or rawSrcProxy found, cannot load"));
            });
        }
    },

    get isLoaded() {
        return '_rawSrc' in this || '_parseTree' in this || (this.isText && '_text' in this);
    },

    /**
     * asset.nonInlineAncestor (getter)
     * ================================
     *
     * Get the first non-inline ancestor asset by following the
     * incoming relations, ie. the first asset that has a
     * url. Returns the asset itself if it's not inline, and null if
     * the asset is inline, but not in an AssetGraph.
     */
    get nonInlineAncestor() {
        if (this.isInline) {
            if (this.assetGraph) {
                var incomingRelations = this.incomingRelations;
                if (incomingRelations.length > 0) {
                    return incomingRelations[0].from.nonInlineAncestor;
                }
            }
            return null;
        } else {
            return this;
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
     * @api public
     */
    get extension() {
        if ('_extension' in this) {
            return this._extension;
        } else {
            return this.defaultExtension;
        }
    },

    set extension(extension) {
        if (!this.isInline) {
            this.url = this.url.replace(/(?:\.\w+)?([?#]|$)/, extension + "$1");
        } else if ('_fileName' in this) {
            if ('_extension' in this) {
                this._fileName = path.basename(this._fileName, this._extension) + extension;
            } else {
                this._fileName += extension;
            }
        }
        this._extension = extension;
    },

    /**
     * asset.fileName (getter/setter)
     * ==============================
     *
     * The file name for the asset (String). It is automatically kept
     * in sync with the url, but preserved if the asset is inlined or
     * set to a value that ends with a slash.
     *
     * If updated, the url of the asset will also be updated.
     *
     * The extension includes the leading dot and is thus kept in the
     * same format as `require('path').extname` and the `basename`
     * command line utility use.
     *
     * @return {String} The extension, eg. ".html" or ".css".
     * @api public
     */
    get fileName() {
        if ('_fileName' in this) {
            return this._fileName;
        }
    },

    set fileName(fileName) {
        if (!this.isInline) {
            this.url = this.url.replace(/[^\/?#]*([?#]|$)/, fileName + "$1");
        }
        this._extension = path.extname(fileName);
        this._fileName = fileName;
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
     * @api public
     */
    get rawSrc() {
        if (!this._rawSrc) {
            this.assetGraph.emit('error', new Error("Asset.rawSrc getter: " + this.url + " isn't loaded"))
        }
        return this._rawSrc;
    },

    set rawSrc(rawSrc) {
        this._clearOutgoingRelations();
        delete this.isPopulated;
        delete this._parseTree;
        this._rawSrc = rawSrc;
        if (this.assetGraph) {
            this.populate();
        }
        this.markDirty();
    },

    /**
     * asset.md5Hex (getter)
     * =====================
     *
     * Get the current md5 hex of the asset.
     */
    get md5Hex() {
        if (!this._md5Hex) {
            this._md5Hex = crypto.createHash('md5').update(this.rawSrc).digest('hex');
        }
        return this._md5Hex;
    },

    /**
     * asset.url (getter/setter)
     * =========================
     *
     * Get or set the absolute url of the asset (String).
     *
     * The url will use the `file:` schema if loaded from disc. Will be
     * falsy for inline assets.
     *
     * @api public
     */
    get url() {
        return this._url;
    },

    set url(url) {
        if (url !== this._url) {
            var oldUrl = this._url;
            this._url = url;
            if (url && !urlEndsWithSlashRegExp.test(url)) {
                var pathname = urlTools.parse(url).pathname;
                this._extension = path.extname(pathname);
                this._fileName = path.basename(pathname);
            }
            if (this.assetGraph) {
                // Update the AssetGraph's indices
                if (this.assetGraph._relationsWithNoBaseAsset.length) {
                    this.assetGraph.recomputeBaseAssets();
                }
                [].concat(this.assetGraph._objInBaseAssetPaths[this.id]).forEach(function (affectedRelation) {
                    if (!oldUrl) {
                        // Un-inlining the asset, need to recompute all base asset paths it's a member of:
                        affectedRelation._unregisterBaseAssetPath();
                        affectedRelation._registerBaseAssetPath();
                    }
                    if (affectedRelation.baseAsset === this) {
                        affectedRelation.refreshHref();
                    }
                }, this);
                this.assetGraph.findRelations({to: this}).forEach(function (incomingRelation) {
                    incomingRelation.refreshHref();
                }, this);
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
     *
     * @return {Asset} The asset itself (chaining-friendly).
     * @api public
     */
    markDirty: function () {
        this.isDirty = true;
        if ('_text' in this || '_parseTree' in this) {
            delete this._rawSrc;
        }
        delete this._md5Hex;
        if (this.isInline && this.assetGraph) {
            // Cascade dirtiness to containing asset and re-inline
            if (this.incomingRelations.length > 1) {
                throw new Error("Asset.markDirty assertion error: Expected a maximum of one incoming relation to inline asset, but found " + this.incomingRelations.length);
            } else if (this.incomingRelations.length === 1) {
                this.incomingRelations[0].inline();
            }
        }
        return this;
    },

    /**
     * asset.outgoingRelations (getter)
     * ================================
     *
     * Get the outgoing relations of the asset. Only supported by a
     * few subclasses (`Css`, `Html`, `CacheManifest`, and
     * `JavaScript`), all others return an empty array.
     *
     * If the asset is part of an AssetGraph, it will be queried for
     * the relations, otherwise the parse tree will be traversed.
     *
     * @return {Array[Relation]} The outgoing relations.
     * @api public
     */
    get outgoingRelations() {
        if (this.assetGraph && this.isPopulated) {
            return this.assetGraph.findRelations({from: this}, true);
        }
        if (!this._outgoingRelations) {
            this._outgoingRelations = this.findOutgoingRelationsInParseTree();
        }
        return this._outgoingRelations;
    },

    findOutgoingRelationsInParseTree: function () {
        return [];
    },

    /**
     * asset.incomingRelations (getter)
     * ================================
     *
     * Get the relations pointing at this asset. Only supported if the
     * asset is part of an AssetGraph.
     *
     * @return {Array[Relation]} The incoming relations.
     * @api public
     */
    get incomingRelations() {
        if (!this.assetGraph) {
            throw new Error("Asset.incomingRelations getter: Asset is not part of an AssetGraph");
        }
        return this.assetGraph.findRelations({to: this});
    },

    /**
     * asset.populate()
     * ================
     *
     * Go through the outgoing relations of the asset and add the ones
     * that refer to assets that are already part of the
     * graph. Recurses into inline assets.
     *
     * You shouldn't need to call this manually.
     *
     * @param {Asset} asset The asset.
     * @return {Asset} The asset itself (chaining-friendly).
     * @api public
     */
    populate: function () {
        if (!this.assetGraph) {
            throw new Error("Asset.populateRelationsToExistingAssets: Asset is not part of an AssetGraph");
        }
        this.outgoingRelations.forEach(function (outgoingRelation) {
            if (!outgoingRelation.assetGraph) {
                if (outgoingRelation.to.url || typeof outgoingRelation.to === 'string') {
                    // See if the target asset is already in the graph by looking up its url:
                    var targetUrl = urlTools.resolveUrl(outgoingRelation.baseAsset.url, outgoingRelation.to.url || outgoingRelation.to),
                        targetAssets = this.assetGraph.findAssets({
                            url: targetUrl
                        });
                    // If multiple assets share the url, prefer the one that was added last (should be customizable?):
                    if (targetAssets.length) {
                        outgoingRelation.to = targetAssets[targetAssets.length - 1];
                    }
                    this.assetGraph.addRelation(outgoingRelation);
                } else {
                    // Inline asset
                    this.assetGraph.addRelation(outgoingRelation);
                    if (!outgoingRelation.to.assetGraph) {
                        this.assetGraph.addAsset(outgoingRelation.to);
                    }
                }
            }
        }, this);
        this.isPopulated = true;
    },

    /**
     * asset.replaceWith(newAsset)
     * ===========================
     *
     * Replace the asset in the graph with another asset, then remove
     * it from the graph.
     *
     * Updates the incoming relations of the old asset to point at the
     * new one and preserves the url of the old asset if it's not
     * inline.
     *
     * @param {Asset} newAsset The asset to put replace this one with.
     * @return {Asset} The new asset.
     * @api public
     */
    replaceWith: function (newAsset) {
        if (!this.assetGraph || !(this.id in this.assetGraph.idIndex)) {
            throw new Error("asset.replaceWith: Current asset isn't in a graph: " + this);
        }
        if (!newAsset || !newAsset.isAsset) {
            throw new Error("asset.replaceWith: newAsset is not an asset: ", newAsset);
        }
        if (newAsset.id in this.assetGraph.idIndex) {
            throw new Error("asset.replaceWith: New asset is already in the graph: " + newAsset);
        }
        this.incomingRelations.forEach(function (incomingRelation) {
            incomingRelation.to = newAsset;
            incomingRelation.refreshHref();
        }, this);
        this.assetGraph.addAsset(newAsset);
        this.assetGraph.removeAsset(this);
        if (this.url && !newAsset.url) {
            newAsset.url = this.url;
        }
        return newAsset;
    },

    /**
     * asset.clone([incomingRelations])
     * ================================
     *
     * Clone this asset instance and add the clone to the graph if
     * this instance is part of a graph. As an extra service,
     * optionally update some caller-specified relations to point at
     * the clone.
     *
     * If this instance isn't inline, a url is made up for the clone.
     *
     * @param {Array[Relation]|Relation} incomingRelations (optional) Some incoming relations that should be pointed at the clone.
     * @return {Asset} The cloned asset.
     * @api public
     */
    clone: function (incomingRelations, preserveUrl) {
        if (incomingRelations && !this.assetGraph) {
            throw new Error("asset.clone(): incomingRelations not supported because asset isn't in a graph");
        }
        // TODO: Clone more metadata
        var constructorOptions = {
            isInitial: this.isInitial,
            extension: this.extension
        };
        if (preserveUrl && !this.isInline) {
            constructorOptions.url = this.url;
        }
        if (this.isText) {
            // Cheaper than encoding + decoding
            constructorOptions.text = this.text;
        } else {
            constructorOptions.rawSrc = this.rawSrc;
        }
        var clone = new this.constructor(constructorOptions);
        if (!preserveUrl && !this.isInline) {
            clone.url = urlTools.resolveUrl(this.url, clone.id + this.extension);
        }
        if (this.assetGraph) {
            if (incomingRelations) {
                if (incomingRelations.isRelation) {
                    incomingRelations = [incomingRelations];
                }
                incomingRelations.forEach(function (incomingRelation) {
                    if (!incomingRelation || !incomingRelation.isRelation) {
                        throw new Error("asset.clone(): Incoming relation is not a relation: ", incomingRelation);
                    }
                    if (incomingRelation.id in this.assetGraph.idIndex) {
                        incomingRelation.to = clone;
                    } else {
                        incomingRelation.to = clone;
                        this.assetGraph.addRelation(incomingRelation); // Hmm, what about position and adjacentRelation?
                    }
                    incomingRelation.refreshHref();
                }, this);
            }
            this.assetGraph.addAsset(clone);
        }
        return clone;
    },

    /**
     * Used right before overwriting .rawSrc or .text Remove the
     * _outgoingRelations property. If the asset is in a graph, also
     * remove the relations from the graph along with any inline
     * assets.
     */
    _clearOutgoingRelations: function () {
        if (this.assetGraph) {
            if (this._outgoingRelations) {
                this._outgoingRelations.forEach(function (outgoingRelation) {
                    this.assetGraph.removeRelation(outgoingRelation);
                    if (outgoingRelation.to.isAsset && outgoingRelation.to.isInline) {
                        // Remove inline asset
                        this.assetGraph.removeAsset(outgoingRelation.to);
                    }
                }, this);
            }
        }
        delete this._outgoingRelations;
    },

    /**
     * asset.toString()
     * ================
     *
     * Get a brief text containing the type, id, and url (if not inline) of the asset.
     *
     * @return {String} The string, eg. "[JavaScript/141 file:///the/thing.js]"
     * @api public
     */
    toString: function () {
        return "[" + this.type + "/" + this.id + (this.url ? " " + this.url : "") + "]";
    }
});

module.exports = Asset;
