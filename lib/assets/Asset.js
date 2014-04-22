/*global setImmediate:true*/
// node 0.8 compat
if (typeof setImmediate === 'undefined') {
    setImmediate = process.nextTick;
}

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
    urlTools = require('urltools'),
    resolveDataUrl = require('../util/resolveDataUrl'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    passError = require('passerror'),
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
    if ('lastKnownByteLength' in config) {
        this._lastKnownByteLength = config.lastKnownByteLength;
        delete config.lastKnownByteLength;
    }
    if (config.rawSrc) {
        this._updateRawSrcAndLastKnownByteLength(config.rawSrc);
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
    this.id = '' + _.uniqueId();
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
     * asset.isExternalizable
     * ======================
     *
     * {Boolean} Whether the asset occurs in a context where it can be
     * made external. If false, the asset will stay inline. Useful for
     * "always inline" assets pointed to by HtmlConditionalComment,
     * HtmlDataBindAttribute, and HtmlKnockoutContainerless
     * relations. Override when creating the asset.
     */
    isExternalizable: true,

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
     * asset.defaultExtension (getter)
     * ===============================
     *
     * {String} The default extension for the asset type.
     *
     * @api public
     */
    get defaultExtension() {
        return (this.supportedExtensions && this.supportedExtensions[0]) || '';
    },

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
     * `Html` and `Xml`:
     *     jsdom document object (https://github.com/tmpvar/jsdom).
     *
     * `Css`
     *     CSSOM CSSStyleSheet object (https://github.com/NV/CSSOM).
     *
     * `JavaScript`
     *     UglifyJS AST object (https://github.com/mishoo/UglifyJS).
     *
     * `Json`
     *     Regular JavaScript object (the result of JSON.parse on the decoded source).
     *
     * `CacheManifest`
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
            setImmediate(cb);
        } else if (that.rawSrcProxy) {
            that.rawSrcProxy(passError(cb, function (rawSrc, metadata) {
                that._updateRawSrcAndLastKnownByteLength(rawSrc);
                if (metadata) {
                    if (metadata.encoding) {
                        // Avoid recoding the asset, just set the encoding.
                        that._encoding = metadata.encoding;
                        delete metadata.encoding;
                    }
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
            setImmediate(function () {
                cb(new Error('Asset.load: No rawSrc or rawSrcProxy found, cannot load'));
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
     * @return {String} The extension part of the url, eg. ".html" or ".css".
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
            this.url = this.url.replace(/(?:\.\w+)?([?#]|$)/, extension + '$1');
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
     * @return {String} The file name part of the url, eg. "foo.html"
     * or "styles.css".
     * @api public
     */
    get fileName() {
        if ('_fileName' in this) {
            return this._fileName;
        }
    },

    set fileName(fileName) {
        if (!this.isInline) {
            this.url = this.url.replace(/[^\/?#]*([?#]|$)/, fileName + '$1');
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
     *     var htmlAsset = new AssetGraph.Html({
     *         rawSrc: new Buffer('<html><body>Hello!</body></html>')
     *     });
     *     htmlAsset.parseTree.body.innerHTML = "Bye!";
     *     htmlAsset.markDirty();
     *     htmlAsset.rawSrc.toString(); // "<html><body>Bye!</body></html>"
     *
     * @return {Buffer} The raw source.
     * @api public
     */
    get rawSrc() {
        if (!this._rawSrc) {
            var err = new Error('Asset.rawSrc getter: Asset isn\'t loaded: ' + this);
            if (this.assetGraph) {
                this.assetGraph.emit('warn', err);
            } else {
                throw err;
            }
        }
        return this._rawSrc;
    },

    set rawSrc(rawSrc) {
        this.unload();
        this._updateRawSrcAndLastKnownByteLength(rawSrc);
        if (this.assetGraph) {
            this.populate();
        }
        this.markDirty();
    },

    _updateRawSrcAndLastKnownByteLength: function (rawSrc) {
        this._rawSrc = rawSrc;
        this._lastKnownByteLength = rawSrc.length;
    },

    // Doesn't force a serialization of the asset if a value has previously been recorded:
    get lastKnownByteLength() {
        if (this._rawSrc) {
            return this._rawSrc.length;
        } else if ('_lastKnownByteLength' in this) {
            return this._lastKnownByteLength;
        } else {
            return this.rawSrc.length; // Force the rawSrc to be computed
        }
    },

    /**
     * Unload the asset body. If the asset is in a graph, also
     * remove the relations from the graph along with any inline
     * assets.
     * Also used internally right to clean up before overwriting
     * .rawSrc or .text.
     */
    unload: function () {
        // Remove inline assets and outgoing relations:
        if (this.assetGraph && this.isPopulated) {
            this.outgoingRelations.forEach(function (outgoingRelation) {
                this.assetGraph.removeRelation(outgoingRelation);
                if (outgoingRelation.to.isAsset && outgoingRelation.to.isInline) {
                    // Remove inline asset
                    this.assetGraph.removeAsset(outgoingRelation.to);
                }
            }, this);
        }
        delete this.isPopulated;
        delete this._outgoingRelations;
        delete this._rawSrc;
        delete this._text;
        delete this._parseTree;
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
        if (!this.isExternalizable) {
            throw new Error(this.toString() + ' cannot set url of non-externalizable asset');
        }
        var oldUrl = this._url;
        if (url && !/^[a-z\+]+:/.test(url)) {
            // Non-absolute
            var baseUrl = oldUrl || (this.assetGraph && this.baseAsset && this.baseAsset.nonInlineAncestor.url) || (this.assetGraph && this.assetGraph.root);
            if (baseUrl) {
                if (/^\/\//.test(url)) {
                    // Protocol-relative
                    url = urlTools.resolveUrl(baseUrl, url);
                } else if (/^\//.test(url)) {
                    // Root-relative
                    if (/^file:/.test(baseUrl) && /^file:/.test(this.assetGraph.root)) {
                        url = urlTools.resolveUrl(this.assetGraph.root, url.substr(1));
                    } else {
                        url = urlTools.resolveUrl(baseUrl, url);
                    }
                } else {
                    // Relative
                    url = urlTools.resolveUrl(baseUrl, url);
                }
            } else {
                throw new Error('Cannot find base url for resolving new url of ' + this.urlOrDescription + ' to non-absolute: ' + url);
            }
        }
        if (url !== oldUrl) {
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
                throw new Error('Asset.markDirty assertion error: Expected a maximum of one incoming relation to inline asset, but found ' + this.incomingRelations.length);
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
            throw new Error('Asset.incomingRelations getter: Asset is not part of an AssetGraph');
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
            throw new Error('Asset.populateRelationsToExistingAssets: Asset is not part of an AssetGraph');
        }
        if (this.isLoaded && !this.keepUnpopulated && !this.isPopulated) {
            this.outgoingRelations.forEach(function (outgoingRelation) {
                if (!outgoingRelation.assetGraph) {
                    if (outgoingRelation.to.url || typeof outgoingRelation.to === 'string') {
                        // See if the target asset is already in the graph by looking up its url:
                        var relativeUrl = outgoingRelation.to.url || outgoingRelation.to;
                        if (/^data:/.test(relativeUrl)) {
                            var assetConfig = resolveDataUrl(relativeUrl);
                            if (assetConfig) {
                                assetConfig.type = this.assetGraph.lookupContentType(assetConfig.contentType);
                                outgoingRelation.to = this.assetGraph.createAsset(assetConfig);
                                this.assetGraph.addAsset(outgoingRelation.to);
                            }
                        } else {
                            var baseAsset = outgoingRelation.baseAsset;
                            if (baseAsset) {
                                var baseAssetUrl = baseAsset.nonInlineAncestor.url,
                                    targetUrl = this.assetGraph.resolveUrl(baseAssetUrl, relativeUrl),
                                    targetAssets = this.assetGraph.findAssets({url: targetUrl});
                                // If multiple assets share the url, prefer the one that was added last (should be customizable?):
                                if (targetAssets.length) {
                                    outgoingRelation.to = targetAssets[targetAssets.length - 1];
                                }
                            }
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
        }
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
            throw new Error('asset.replaceWith: Current asset isn\'t in a graph: ' + this);
        }
        if (!newAsset || !newAsset.isAsset) {
            throw new Error('asset.replaceWith: newAsset is not an asset: ', newAsset);
        }
        if (newAsset.id in this.assetGraph.idIndex) {
            throw new Error('asset.replaceWith: New asset is already in the graph: ' + newAsset);
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
            throw new Error('asset.clone(): incomingRelations not supported because asset isn\'t in a graph');
        }
        // TODO: Clone more metadata
        var constructorOptions = {
            isInitial: this.isInitial,
            extension: this.extension,
            lastKnownByteLength: this.lastKnownByteLength
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
        if (typeof this._isFragment !== 'undefined') {
            // FIXME: Belongs in the subclass
            constructorOptions._isFragment = this._isFragment;
        }
        if (this.type === 'JavaScript') {
            // FIXME: Belongs in the subclass
            if (this.initialComments) {
                constructorOptions.initialComments = this.initialComments;
            }
            if (this.quoteChar) {
                constructorOptions.quoteChar = this.quoteChar;
            }
            constructorOptions.isRequired = this.isRequired;
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
                        throw new Error('asset.clone(): Incoming relation is not a relation: ', incomingRelation);
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
            clone.baseAssetSubstitute = this;
            this.assetGraph.addAsset(clone);
            delete clone.baseAssetSubstitute;
        }
        return clone;
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
        return '[' + this.type + '/' + this.id + (this.url ? ' ' + this.url : '') + ']';
    },

    get urlOrDescription() {
        return this.url || ('inline ' + this.type + (this.nonInlineAncestor ? ' in ' + this.nonInlineAncestor.url : ''));
    }
});

module.exports = Asset;
