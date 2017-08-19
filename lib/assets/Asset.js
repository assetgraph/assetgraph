/**
 * @class Asset
 *
 * An asset object represents a single node in an AssetGraph, but can
 * be used and manipulated on its own outside the graph context.
 */
const pathModule = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const constants = process.ENOENT ? process : require('constants');
const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
const _ = require('lodash');
const extendDefined = require('../util/extendDefined');
const urlTools = require('urltools');
const urlModule = require('url');
const determineFileType = require('../util/determineFileType');
const AssetGraph = require('../AssetGraph');
const knownAndUnsupportedProtocols = require('schemes').allByName;
const urlEndsWithSlashRegExp = /\/(?:[?#].*)?$/;

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
class Asset extends EventEmitter {
    constructor(config) {
        super();
        this.init(config);
    }

    init(config = {}) {
        if (typeof config.lastKnownByteLength === 'number') {
            this._lastKnownByteLength = config.lastKnownByteLength;
        }
        if (config.rawSrc) {
            this._updateRawSrcAndLastKnownByteLength(config.rawSrc);
        }
        if (config.parseTree) {
            this._parseTree = config.parseTree;
        }
        if (typeof config.text === 'string') {
            this._text = config.text;
        }
        if (config.encoding) {
            this._encoding = config.encoding;
        }
        if (config.sourceMap) {
            this._sourceMap = config.sourceMap;
        }
        if (config.url) {
            this._url = config.url.trim();
            if (!urlEndsWithSlashRegExp.test(this._url)) {
                const urlObj = urlTools.parse(this._url);
                // Guard against mailto: and the like
                if (/^(?:https?|file):/.test(urlObj.protocol)) {
                    const pathname = urlTools.parse(this._url).pathname;
                    this._extension = pathModule.extname(pathname);
                    this._fileName = pathModule.basename(pathname);
                    this._baseName = pathModule.basename(pathname, this._extension);
                }
            }
        } else {
            if (typeof config.fileName === 'string' && typeof this._fileName !== 'string') {
                this._fileName = config.fileName;
                this._extension = pathModule.extname(this._fileName);
            }
            if (typeof config.baseName === 'string' && typeof this._baseName !== 'string') {
                this._baseName = config.baseName;
            }
            if (typeof config.extension === 'string' && typeof this._extension !== 'string') {
                this._extension = config.extension;
            }
        }
        extendDefined(this, _.omit(config, ['rawSrc', 'parseTree', 'text', 'encoding', 'sourceMap', 'lastKnownByteLength', 'url', 'fileName', 'extension']));
        if (!this.id) {
            this.id = '' + _.uniqueId();
        }
    }

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
    }

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
     * asset.loadAsync()
     * =================
     *
     * Returns a promise that is resolved when the asset is loaded.
     * This is Asset's only async method, as soon as it is
     * loaded, everything can happen synchronously.
     *
     * Usually you'll want to use `transforms.loadAssets`, which will
     * handle this automatically.
     *
     * @return {Promise} Fulfilled with the asset instance once loaded.
     * @api public
     */
    async loadAsync() {
        try {
            if (!this.isLoaded) {
                if (!this.url) {
                    throw new Error('Asset.load: No url, cannot load');
                }

                const url = this.url;
                const protocol = url.substr(0, url.indexOf(':')).toLowerCase();
                if (protocol === 'file') {
                    const pathname = urlTools.fileUrlToFsPath(url);
                    try {
                        this._rawSrc = await fs.readFileAsync(pathname);
                        this._updateRawSrcAndLastKnownByteLength(this._rawSrc);
                    } catch (err) {
                        if (err.code === 'EISDIR' || err.errno === constants.EISDIR || err.code === 'EINVAL' || err.errno === constants.EINVAL) {
                            this.fileRedirectTargetUrl = urlTools.fsFilePathToFileUrl(pathname.replace(/(\/)?$/, '/index.html'));
                            // Make believe it's loaded:
                            this._rawSrc = new Buffer([]);
                        } else {
                            throw err;
                        }
                    }
                } else if (protocol === 'http' || protocol === 'https') {
                    const response = await this.assetGraph.teepee.request(_.defaults({ url: url, json: false }, this.assetGraph.requestOptions));
                    this.statusCode = response.statusCode;
                    this._rawSrc = response.body;
                    this._updateRawSrcAndLastKnownByteLength(this._rawSrc);
                    if (response.headers.location) {
                        this.location = response.headers.location;
                    }
                    const contentType = response.headers['content-type'];
                    if (contentType) {
                        const matchContentType = contentType.match(/^\s*([\w\-\+\.]+\/[\w\-\+\.]+)(?:\s|;|$)/i);
                        if (matchContentType) {
                            this.contentType = matchContentType[1].toLowerCase();
                            const matchCharset = contentType.match(/;\s*charset\s*=\s*(['"]|)\s*([\w\-]+)\s*\1(?:\s|;|$)/i);
                            if (matchCharset) {
                                this._encoding = matchCharset[2].toLowerCase();
                            }
                        }
                    }
                    if (response.headers.etag) {
                        this.etag = response.headers.etag;
                    }
                    if (response.headers['cache-control']) {
                        this.cacheControl = response.headers['cache-control'];
                    }
                    if (response.headers['content-security-policy']) {
                        this.contentSecurityPolicy = response.headers['content-security-policy'];
                    }
                    if (response.headers['content-security-policy-report-only']) {
                        this.contentSecurityPolicyReportOnly = response.headers['content-security-policy-report-only'];
                    }
                    for (const headerName of ['date', 'last-modified']) {
                        if (response.headers[headerName]) {
                            this[headerName.replace(/-([a-z])/, function ($0, ch) {
                                return ch.toUpperCase();
                            })] = new Date(response.headers[headerName]);
                        }
                    }
                } else if (!knownAndUnsupportedProtocols[protocol]) {
                    const err = new Error(`No resolver found for protocol: ${protocol}\n\tIf you think this protocol should exist, please contribute it here:\n\thttps://github.com/Munter/schemes#contributing`);
                    if (this.assetGraph) {
                        this.assetGraph.warn(err);
                    } else {
                        throw err;
                    }
                }
            }

            // Try to upgrade to a subclass based on the provided Class or this.contentType
            let Class;
            if (this.hasOwnProperty('contentType')) {
                const typeFromContentType = AssetGraph.lookupContentType(this.contentType);
                if (typeFromContentType && typeFromContentType !== 'Asset') {
                    Class = AssetGraph[typeFromContentType];
                }
            }
            if (!Class && this.type && this.type !== 'Asset') {
                Class = AssetGraph[this.type];
            }
            if (!Class || Class === AssetGraph.Image || Class === AssetGraph.Text || Class === AssetGraph.Font) {
                let commonTargetType;
                for (const incomingRelation of this.incomingRelations) {
                    if (incomingRelation.targetType) {
                        if (!commonTargetType) {
                            commonTargetType = incomingRelation.targetType;
                        } else if (commonTargetType !== incomingRelation.targetType) {
                            this.assetGraph.warn(new Error(`${this.urlOrDescription} used as both ${commonTargetType} and ${incomingRelation.targetType}`));
                            commonTargetType = undefined;
                            break;
                        }
                    }
                }
                if (commonTargetType) {
                    if (Class && !AssetGraph[commonTargetType].prototype['is' + Class.prototype.type]) {
                        this.from.warn(`${this.urlOrDescription} used as both ${Class.prototype.type} and ${commonTargetType}`);
                    } else {
                        Class = AssetGraph[commonTargetType];
                    }
                }
            }
            if (this.url) {
                const type = AssetGraph.typeByExtension[pathModule.extname(this.url.replace(/[\?\#].*$/, '')).toLowerCase()];
                // If the incoming relation type says Image (abstract), allow subclassing based on the file extension:
                if (type && (!Class || (Class === AssetGraph.Image && AssetGraph[type].prototype.isImage) || (Class === AssetGraph.Text && AssetGraph[type].prototype.isText) || (Class === AssetGraph.Font && AssetGraph[type].prototype.isFont))) {
                    Class = AssetGraph[type];
                }
            }
            if ((!Class || Class === AssetGraph.Image) && (this._rawSrc || typeof this._text === 'string') && !this.hasOwnProperty('contentType')) {
                const detectedContentType = await determineFileType(this._rawSrc || this._text);
                if (detectedContentType) {
                    this.contentType = detectedContentType;
                    const typeFromDetectedContentType = AssetGraph.typeByContentType[this.contentType];
                    if (typeFromDetectedContentType && typeFromDetectedContentType !== 'Asset') {
                        if (!Class || (Class === AssetGraph.Image && AssetGraph[typeFromDetectedContentType].prototype.isImage) || (Class === AssetGraph.Font && AssetGraph[typeFromDetectedContentType].prototype.isFont)) {
                            Class = AssetGraph[typeFromDetectedContentType];
                        }
                    }
                }
            }
            if (Class) {
                // Only allow upgrading from a superclass:
                let superclass = Object.getPrototypeOf(Class);
                while (superclass) {
                    if (superclass === this.constructor) {
                        Object.setPrototypeOf(this, Class.prototype);
                        this.init();
                        // This is a smell: Maybe we should find a way to avoid populating non-upgraded Asset instances,
                        // but what about HttpRedirect and FileRedirect, then?
                        this.isPopulated = false;
                        this._outgoingRelations = undefined;
                        break;
                    }
                    superclass = Object.getPrototypeOf(superclass);
                }
            }

            this.emit('load', this);
            if (this.assetGraph) {
                this.populate();
            }
            return this;
        } catch (err) {
            err.message = err.message || err.code || err.name;
            const includingAssetUrls = this.incomingRelations.map(incomingRelation => {
                return incomingRelation.from.urlOrDescription;
            });
            if (includingAssetUrls.length > 0) {
                err.message += '\nIncluding assets:\n    ' + includingAssetUrls.join('\n    ') + '\n';
            }
            err.asset = this;
            throw err;
        }
    }

    get isLoaded() {
        return this._rawSrc !== undefined || this._parseTree !== undefined || typeof this._text === 'string';
    }

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
        if (!this.isInline) {
            return this;
        }
        if (this.incomingInlineRelation) {
            return this.incomingInlineRelation.from.nonInlineAncestor;
        } else if (this.assetGraph) {
            const incomingRelations = this.incomingRelations;
            if (incomingRelations.length > 0) {
                return incomingRelations[0].from.nonInlineAncestor;
            }
        }
        return null;
    }

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
        if (typeof this._extension === 'string') {
            return this._extension;
        } else {
            return this.defaultExtension;
        }
    }

    set extension(extension) {
        if (!this.isInline) {
            this.url = this.url.replace(/(?:\.\w+)?([?#]|$)/, extension + '$1');
        } else if (typeof this._fileName === 'string') {
            this._fileName = pathModule.basename(this._fileName, this._extension) + extension;
        }
        this._extension = extension;
    }

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
        if (typeof this._fileName === 'string') {
            return this._fileName;
        }
    }

    set fileName(fileName) {
        if (!this.isInline) {
            this.url = this.url.replace(/[^\/?#]*([?#]|$)/, fileName + '$1');
        }
        this._extension = pathModule.extname(fileName);
        this._baseName = pathModule.extname(fileName, this._extension);
        this._fileName = fileName;
    }

    /**
     * asset.baseName (getter/setter)
     * ==============================
     *
     * The file name for the asset, excluding the extension. It is automatically
     * kept in sync with the url, but preserved if the asset is inlined or
     * set to a value that ends with a slash.
     *
     * If updated, the url of the asset will also be updated.
     *
     * @return {String} The file name part of the url, excluding the extension,
     * eg. "foo" or "styles".
     * @api public
     */
    get baseName() {
        if (typeof this._baseName === 'string') {
            return this._baseName;
        }
    }

    set baseName(baseName) {
        if (!this.isInline) {
            this.url = this.url.replace(/[^\/?#]*([?#]|$)/, baseName + this.extension + '$1');
        }
        this._fileName = baseName + this.extension;
    }

    get origin() {
        const nonInlineAncestor = this.nonInlineAncestor;
        if (nonInlineAncestor) {
            const urlObj = urlModule.parse(nonInlineAncestor.url);
            if (urlObj) {
                return urlObj.protocol + (urlObj.slashes ? '//' : '') + (urlObj.host || '');
            }
        }
    }

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
     *     const htmlAsset = new AssetGraph.Html({
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
        if (this._rawSrc) {
            return this._rawSrc;
        }

        const err = new Error('Asset.rawSrc getter: Asset isn\'t loaded: ' + this);
        if (this.assetGraph) {
            this.assetGraph.warn(err);
        } else {
            throw err;
        }
    }

    set rawSrc(rawSrc) {
        this.unload();
        this._updateRawSrcAndLastKnownByteLength(rawSrc);
        if (this.assetGraph) {
            this.populate();
        }
        this.markDirty();
    }

    get dataUrl() {
        if (this.isText) {
            const text = this.text;
            const urlEncodedText = encodeURIComponent(text).replace(/%2C/g, ',');
            const isUsAscii = !/[\x80-\uffff]/.test(text);
            const charsetParam = isUsAscii ? '' : ';charset=UTF-8';
            if (urlEncodedText.length + charsetParam.length < ';base64'.length + this.rawSrc.length * 1.37) {
                return 'data:' + this.contentType + (isUsAscii ? '' : ';charset=UTF-8') + ',' + urlEncodedText;
            }
        }
        // Default to base64 encoding:
        return `data:${this.contentType};base64,${this.rawSrc.toString('base64')}`;
    }

    _updateRawSrcAndLastKnownByteLength(rawSrc) {
        this._rawSrc = rawSrc;
        this._lastKnownByteLength = rawSrc.length;
    }

    // Doesn't force a serialization of the asset if a value has previously been recorded:
    get lastKnownByteLength() {
        if (this._rawSrc) {
            return this._rawSrc.length;
        } else if (typeof this._lastKnownByteLength === 'number') {
            return this._lastKnownByteLength;
        } else {
            return this.rawSrc.length; // Force the rawSrc to be computed
        }
    }

    externalize(baseUrl) {
        let nextSuffixToTry = 0;
        let baseName = this.baseName || this.id;
        let extension = this.extension || this.defaultExtension;
        let url;
        do {
            url = this.assetGraph.resolveUrl(baseUrl || this.assetGraph.root,  baseName + (nextSuffixToTry ? '-' + nextSuffixToTry : '') + extension);
            nextSuffixToTry += 1;
        } while (this.assetGraph._urlIndex[url]);
        this.url = url;
    }

    /**
     * Unload the asset body. If the asset is in a graph, also
     * remove the relations from the graph along with any inline
     * assets.
     * Also used internally right to clean up before overwriting
     * .rawSrc or .text.
     */
    unload() {
        if (this._outgoingRelations) {
            // Remove inline assets and outgoing relations:
            if (this.assetGraph && this.isPopulated) {
                for (const outgoingRelation of [].concat(this.outgoingRelations)) {
                    if (outgoingRelation.to.isAsset && outgoingRelation.to.isInline) {
                        // Remove inline asset
                        this.assetGraph.removeAsset(outgoingRelation.to);
                    }
                }
            }
            this._outgoingRelations = undefined;
        }
        this.isPopulated = undefined;
        this._rawSrc = undefined;
        this._text = undefined;
        this._parseTree = undefined;
    }

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
    }

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
    }

    set url(url) {
        if (!this.isExternalizable) {
            throw new Error(this.toString() + ' cannot set url of non-externalizable asset');
        }
        const oldUrl = this._url;
        if (url && !/^[a-z\+]+:/.test(url)) {
            // Non-absolute
            const baseUrl = oldUrl || (this.assetGraph && this.baseAsset && this.baseUrl) || (this.assetGraph && this.assetGraph.root);
            if (!baseUrl) {
                throw new Error('Cannot find base url for resolving new url of ' + this.urlOrDescription + ' to non-absolute: ' + url);
            }

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
        }
        if (url !== oldUrl) {
            this._url = url;
            if (this.assetGraph) {
                if (oldUrl) {
                    if (this.assetGraph._urlIndex[oldUrl] !== this) {
                        throw new Error(`${oldUrl} was not in the _urlIndex`);
                    }
                    delete this.assetGraph._urlIndex[oldUrl];
                }
                if (url) {
                    if (this.assetGraph._urlIndex[url]) {
                        if (this.assetGraph._urlIndex[url] !== this) {
                            throw new Error(`${url} already exists in the graph, cannot update url`);
                        }
                    } else {
                        this.assetGraph._urlIndex[url] = this;
                    }
                }
            }
            if (url) {
                this.incomingInlineRelation = undefined;
                if (!urlEndsWithSlashRegExp.test(url)) {
                    const pathname = urlTools.parse(url).pathname;
                    this._extension = pathModule.extname(pathname);
                    this._fileName = pathModule.basename(pathname);
                    this._baseName = pathModule.basename(pathname, this._extension);
                }
            }
            if (this.assetGraph) {
                for (const incomingRelation of this.assetGraph.findRelations({to: this})) {
                    incomingRelation.refreshHref();
                }
                for (const relation of this.externalRelations) {
                    relation.refreshHref();
                }
            }
        }
    }

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
    }

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
    markDirty() {
        this.isDirty = true;
        if (typeof this._text === 'string' || this._parseTree !== undefined) {
            this._rawSrc = undefined;
        }
        this._md5Hex = undefined;
        if (this.isInline && this.assetGraph) {
            // Cascade dirtiness to containing asset and re-inline
            if (this.incomingRelations.length > 1) {
                throw new Error('Asset.markDirty assertion error: Expected a maximum of one incoming relation to inline asset, but found ' + this.incomingRelations.length);
            } else if (this.incomingRelations.length === 1) {
                this.incomingRelations[0].inline();
            }
        }
        return this;
    }

    _vivifyRelation(outgoingRelation) {
        outgoingRelation.from = this;
        if (!outgoingRelation.isRelation) {
            if (typeof outgoingRelation.href === 'string') {
                outgoingRelation.to = { url: outgoingRelation.href };
                delete outgoingRelation.href;
            }
            const type = outgoingRelation.type;
            delete outgoingRelation.type;
            outgoingRelation = new AssetGraph[type](outgoingRelation);
            if (outgoingRelation.to && this.assetGraph) {
                // Implicitly create the target asset:
                outgoingRelation.to = this.assetGraph.add(outgoingRelation.to, outgoingRelation);
                const targetType = outgoingRelation.targetType;
                if (targetType && !outgoingRelation.to._isCompatibleWith(targetType)) {
                    this.assetGraph.warn(new Error(`${outgoingRelation.to.urlOrDescription} used as both ${targetType} and ${outgoingRelation.to.type}`));
                }
            }
        }
        return outgoingRelation;
    }

    /**
     * asset.outgoingRelations (getter)
     * ================================
     *
     * Get the outgoing relations of the asset.
     *
     * @return {Array[Relation]} The outgoing relations.
     * @api public
     */
    get outgoingRelations() {
        if (!this._outgoingRelations) {
            this._outgoingRelations = this.findOutgoingRelationsInParseTree()
                .map(outgoingRelation => this._vivifyRelation(outgoingRelation));
        }
        return this._outgoingRelations;
    }

    set outgoingRelations(outgoingRelations) {
        this._outgoingRelations = outgoingRelations
            .map(outgoingRelation => this._vivifyRelation(outgoingRelation));
    }

    addRelation(relation, position, adjacentRelation) {
        relation = this._vivifyRelation(relation);
        position = position || 'last';
        if (typeof relation.node === 'undefined' && relation.attach) {
            relation.attach(position, adjacentRelation);
        } else {
            relation.addToOutgoingRelations(position, adjacentRelation);
            relation.refreshHref();
        }
        this.assetGraph.emit('addRelation', relation); // Consider getting rid of this
        return relation;
    }

    removeRelation(relation) {
        if (this._outgoingRelations) {
            const outgoingRelations = this.outgoingRelations;
            const i = outgoingRelations.indexOf(relation);
            if (i !== -1) {
                outgoingRelations.splice(i, 1);
            }
        }
        return this;
    }

    get externalRelations() {
        const externalRelations = [];
        (function gatherExternalRelations(asset) {
            if (asset.keepUnpopulated || !asset.isLoaded) {
                return;
            }
            for (const outgoingRelation of asset.outgoingRelations) {
                if (outgoingRelation.to.isInline) {
                    gatherExternalRelations(outgoingRelation.to);
                } else {
                    externalRelations.push(outgoingRelation);
                }
            }
        }(this));
        return externalRelations;
    }

    findOutgoingRelationsInParseTree() {
        const outgoingRelations = [];
        if (typeof this.statusCode === 'number' && this.statusCode >= 301 && this.statusCode <= 303 && this.location !== undefined) {
            outgoingRelations.push({
                type: 'HttpRedirect',
                statusCode: this.statusCode,
                href: this.location
            });
        } else if (this.fileRedirectTargetUrl) {
            outgoingRelations.push({
                type: 'FileRedirect',
                href: this.fileRedirectTargetUrl
            });
        }
        return outgoingRelations;
    }

    /**
     * asset.incomingRelations (getter)
     * ================================
     *
     * Get the relations pointing at this asset.
     *
     * @return {Array[Relation]} The incoming relations.
     * @api public
     */
    get incomingRelations() {
        if (!this.assetGraph) {
            throw new Error('Asset.incomingRelations getter: Asset is not part of an AssetGraph');
        }
        return this.assetGraph.findRelations({to: this});
    }

    /**
     * asset.incomingRelations (getter)
     * ================================
     *
     * Point existing relations at this asset.
     * Caveat: Does not remove/detach other relations already pointing at the
     * asset, but not included in the array, so it's not strictly symmetric
     * with the incomingRelations getter.
     *
     * @param {Array[Relation]} The incoming relations.
     * @api public
     */
    set incomingRelations(incomingRelations) {
        for (const relation of incomingRelations) {
            relation.to = this;
            relation.refreshHref();
        }
    }

    /**
     * asset.populate()
     * ================
     *
     * Go through the outgoing relations of the asset and add the ones
     * that refer to assets that are already part of the
     * graph. Recurses into inline assets.
     *
     * You shouldn't need to call this manually.
     */
    populate() {
        if (!this.assetGraph) {
            throw new Error('Asset.populate: Asset is not part of an AssetGraph');
        }
        if (this.isLoaded && !this.keepUnpopulated && !this.isPopulated) {
            this.outgoingRelations; // For the side effects
            this.isPopulated = true;
        }
    }

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
    replaceWith(newAsset) {
        newAsset.url = null;
        newAsset = this.assetGraph.add(newAsset);
        for (const incomingRelation of this.incomingRelations) {
            incomingRelation.to = newAsset;
            incomingRelation.refreshHref();
        }
        this.assetGraph.removeAsset(this);
        if (this.url) {
            newAsset.url = this.url;
        }
        return newAsset;
    }

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
    clone(incomingRelations) {
        if (incomingRelations && !this.assetGraph) {
            throw new Error('asset.clone(): incomingRelations not supported because asset isn\'t in a graph');
        }
        // TODO: Clone more metadata
        const constructorOptions = {
            isInitial: this.isInitial,
            isMinified: this.isMinified,
            isPretty: this.isPretty,
            isDirty: this.isDirty,
            extension: this.extension,
            lastKnownByteLength: this.lastKnownByteLength,
            serializationOptions: this.serializationOptions && Object.assign({}, this.serializationOptions)
        };
        if (this.type === 'JavaScript' || this.type === 'Css') {
            if (this._parseTree) {
                constructorOptions.parseTree = this._cloneParseTree();
                if (typeof this._text === 'string') {
                    constructorOptions.text = this._text;
                }
                if (this._rawSrc) {
                    constructorOptions.rawSrc = this._rawSrc;
                }
            } else {
                const sourceMap = this.sourceMap;
                if (sourceMap) {
                    constructorOptions.sourceMap = sourceMap;
                }
            }
        } else if (this.isText) {
            // Cheaper than encoding + decoding
            constructorOptions.text = this.text;
        } else {
            constructorOptions.rawSrc = this.rawSrc;
        }
        if (this._isFragment !== undefined) {
            // FIXME: Belongs in the subclass
            constructorOptions._isFragment = this._isFragment;
        }
        if (this.type === 'JavaScript') {
            // FIXME: Belongs in the subclass
            if (this.initialComments) {
                constructorOptions.initialComments = this.initialComments;
            }
            constructorOptions.isRequired = this.isRequired;
        }
        if (!this.isInline) {
            let nextSuffixToTry = 0;
            let baseName = this.baseName || this.id;
            let extension = this.extension || this.defaultExtension;
            do {
                constructorOptions.url = this.assetGraph.resolveUrl(this.url, baseName + (nextSuffixToTry ? '-' + nextSuffixToTry : '') + extension);
                nextSuffixToTry += 1;
            } while (this.assetGraph._urlIndex[constructorOptions.url]);
        }
        const clone = new this.constructor(constructorOptions);

        if (this.assetGraph) {
            this.assetGraph.add(clone);
            if (!this.isInline) {
                clone.externalize(this.url);
            }
            if (incomingRelations) {
                if (incomingRelations.isRelation) {
                    incomingRelations = [incomingRelations];
                }
                for (const incomingRelation of incomingRelations) {
                    if (!incomingRelation || !incomingRelation.isRelation) {
                        throw new Error('asset.clone(): Incoming relation is not a relation: ' + incomingRelation.toString());
                    }
                    incomingRelation.to = clone;
                    incomingRelation.refreshHref();
                }
            }
        }
        return clone;
    }

    _isCompatibleWith(Class) {
        if (typeof Class === 'string') {
            Class = this.assetGraph[Class];
        }

        return this instanceof Class || Class.prototype instanceof AssetGraph[this.type] ||
            !!(this.isImage && Class === AssetGraph.Image); // Svg is modelled as a subclass of Xml, not Image
    }

    /**
     * asset.toString()
     * ================
     *
     * Get a brief text containing the type, id, and url (if not inline) of the asset.
     *
     * @return {String} The string, eg. "[JavaScript/141 file:///the/thing.js]"
     * @api public
     */
    toString() {
        return `[${this.type}/${this.id} ${this.urlOrDescription}]`;
    }

    get urlOrDescription() {
        function makeRelativeToCwdIfPossible(url) {
            if (/^file:\/\//.test(url)) {
                return pathModule.relative(process.cwd(), urlTools.fileUrlToFsPath(url));
            } else {
                return url;
            }
        }
        return this.url ? makeRelativeToCwdIfPossible(this.url) : `inline ${this.type}` + (this.nonInlineAncestor ? ` in ${makeRelativeToCwdIfPossible(this.nonInlineAncestor.url)}` : '');
    }
}

Object.assign(Asset.prototype, {
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
    contentType: 'application/octet-stream'
});

module.exports = Asset;
