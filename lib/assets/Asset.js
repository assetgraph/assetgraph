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
const qs = require('qs');
const determineFileType = require('../util/determineFileType');
const AssetGraph = require('../AssetGraph');
const knownAndUnsupportedProtocols = require('schemes').allByName;
const urlEndsWithSlashRegExp = /\/(?:[?#].*)?$/;
const { URL } = require('url');

/**
 * Configuration object used to construct Assets in all places where an asset is automatically
 * constructed. For example in [AssetGraph.addAsset]{@link AssetGraph#addAsset}
 * or in the `to`-property in [Asset.addRelation]{@link Asset#addRelation}
 *
 *
 * @typedef {Object} AssetConfig
 *
 * @property {String} [type] The Assets type. Will be inferred if missing
 *
 * @property {Buffer} [rawSrc] `Buffer` object containing the raw source of the asset
 *
 * @property {String} [contentType] The Content-Type (MIME type) of the asset. For
 * subclasses of Asset there will be a reasonable default.
 *
 * @property {String} [url] The fully qualified (absolute) url of the asset.
 * If not provided, the asset will be considered inline. This property takes precedence
 * over all other url parts in the configuration
 *
 * @property {String} [fileName]
 * @property {String} [baseName]
 * @property {String} [extension]
 * @property {String} [protocol]
 * @property {String} [username]
 * @property {String} [password]
 * @property {String} [hostname]
 * @property {Number} [port]
 * @property {String} [path]
 */

/**
 * An asset object represents a single node in an AssetGraph, but can
 * be used and manipulated on its own outside the graph context.
 */
class Asset extends EventEmitter {
  /**
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
   * @constructor
   * @param {AssetConfig} config Configuration for instantiating an asset
   * @param {AssetGraph} assetGraph Mandatory AssetGraph instance references
   */
  constructor(config, assetGraph) {
    super();
    if (!assetGraph) {
      throw new Error('2nd argument (assetGraph) is mandatory');
    }
    this.assetGraph = assetGraph;
    if (config.id) {
      this.id = config.id;
    } else {
      this.id = `${_.uniqueId()}`;
    }
    this.init(config);
  }

  init(config = {}) {
    if (typeof config.lastKnownByteLength === 'number') {
      this._lastKnownByteLength = config.lastKnownByteLength;
    }
    if (config.type) {
      this._type = config.type;
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
      this._updateUrlIndex(this._url);
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
      extendDefined(
        this,
        _.omit(config, [
          'rawSrc',
          'parseTree',
          'text',
          'encoding',
          'sourceMap',
          'lastKnownByteLength',
          'url',
          'fileName',
          'extension'
        ])
      );
    } else {
      if (
        typeof config.fileName === 'string' &&
        typeof this._fileName !== 'string'
      ) {
        this._fileName = config.fileName;
        this._extension = pathModule.extname(this._fileName);
      }
      for (const propertyName of [
        'baseName',
        'extension',
        'protocol',
        'username',
        'password',
        'hostname',
        'port'
      ]) {
        if (
          typeof config[propertyName] !== 'undefined' &&
          typeof this[`_${propertyName}`] === 'undefined'
        ) {
          this[`_${propertyName}`] = config[propertyName];
        }
      }
      if (
        typeof config.path !== 'undefined' &&
        typeof this._path === 'undefined'
      ) {
        this._path = config.path;
      }
      extendDefined(
        this,
        _.omit(config, [
          'rawSrc',
          'parseTree',
          'text',
          'encoding',
          'sourceMap',
          'lastKnownByteLength',
          'url',
          'fileName',
          'extension',
          'protocol',
          'username',
          'password',
          'hostname',
          'port',
          'path',
          'id'
        ])
      );
    }
  }

  _inferType(incomingRelation) {
    if (!this._inferredType) {
      let typeFromContentType;
      if (this.hasOwnProperty('contentType')) {
        typeFromContentType = AssetGraph.lookupContentType(this.contentType);
        if (typeFromContentType) {
          this._inferredType = typeFromContentType;
        }
      }
      if (
        !this._inferredType ||
        this._inferredType === 'Image' ||
        this._inferredType === 'Font'
      ) {
        let firstFoundTargetType;
        const incomingRelations = this.incomingRelations;
        if (incomingRelation) {
          incomingRelations.push(incomingRelation);
        }
        for (const incomingRelation of incomingRelations) {
          if (incomingRelation.targetType) {
            firstFoundTargetType = incomingRelation.targetType;
            break;
          }
        }
        if (firstFoundTargetType) {
          if (
            !this._inferredType ||
            AssetGraph[firstFoundTargetType].prototype[
              `is${this._inferredType}`
            ]
          ) {
            this._inferredType = firstFoundTargetType;
          }
        }
      }
      const typeFromExtension =
        this.url &&
        AssetGraph.typeByExtension[
          pathModule.extname(this.url.replace(/[?#].*$/, '')).toLowerCase()
        ];
      if (
        typeFromExtension &&
        // avoid upgrading from explicit Content-Type: text/plain to eg. JavaScript based on the file extension
        (!this._inferredType ||
          (AssetGraph[typeFromExtension].prototype[`is${this._inferredType}`] &&
            typeFromContentType !== 'Text'))
      ) {
        this._inferredType = typeFromExtension;
      }
    }
    return this._inferredType;
  }

  _upgrade(Class) {
    Object.setPrototypeOf(this, Class.prototype);
    this.init();
    // This is a smell: Maybe we should find a way to avoid populating non-upgraded Asset instances,
    // but what about HttpRedirect and FileRedirect, then?
    this.isPopulated = false;
    this._outgoingRelations = undefined;
  }

  _tryUpgrade(type, incomingRelation) {
    type = type || this._inferType(incomingRelation);
    if (type === this.constructor.name) {
      return;
    }
    if (
      /^https?:/.test(this.protocol) &&
      !this.hasOwnProperty('contentType') &&
      !this._type
    ) {
      return;
    }
    const Class = AssetGraph[type];
    if (Class) {
      // Allow upgrading from Image to Svg, or from Font to Svg:
      if (
        Class.prototype.type !== this.type &&
        Class.prototype[`is${this.type}`]
      ) {
        this._upgrade(Class);
      } else {
        // Only allow upgrading from a superclass:
        let superclass = Object.getPrototypeOf(Class);
        while (superclass) {
          if (superclass === this.constructor) {
            this._upgrade(Class);
            break;
          }
          superclass = Object.getPrototypeOf(superclass);
        }
      }
    }
  }

  /**
   * The assets defined or inferred type
   *
   * @type {String}
   */
  get type() {
    if (this._type) {
      return this._type;
    } else {
      return this._inferType();
    }
  }

  /**
   * The default extension for the asset type, prepended with a dot, eg. `.html`, `.js` or `.png`
   *
   * @type {String}
   */
  get defaultExtension() {
    return (this.supportedExtensions && this.supportedExtensions[0]) || '';
  }

  /**
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
   *     Esprima AST object (http://esprima.org/).
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
   * @member {Oject} Asset#parseTree
   */

  /**
   * Load the Asset
   *
   * Returns a promise that is resolved when the asset is loaded.
   * This is Asset's only async method, as soon as it is
   * loaded, everything can happen synchronously.
   *
   * Usually you'll want to use `transforms.loadAssets`, which will
   * handle this automatically.
   *
   * @async
   * @return {Promise<Asset>} The loaded Asset
   */
  async load({ metadataOnly = false } = {}) {
    try {
      if (!this.isLoaded) {
        if (!this.url) {
          throw new Error('Asset.load: No url, cannot load');
        }

        const url = this.url;
        const protocol = url.substr(0, url.indexOf(':')).toLowerCase();
        if (protocol === 'file') {
          const pathname = urlTools.fileUrlToFsPath(url);
          if (metadataOnly) {
            const stats = await fs.statAsync(pathname);
            if (stats.isDirectory()) {
              this.fileRedirectTargetUrl = urlTools.fsFilePathToFileUrl(
                pathname.replace(/(\/)?$/, '/index.html')
              );
              // Make believe it's loaded:
              this._rawSrc = Buffer.from([]);
            }
          } else {
            try {
              this._rawSrc = await fs.readFileAsync(pathname);
              this._updateRawSrcAndLastKnownByteLength(this._rawSrc);
            } catch (err) {
              if (
                err.code === 'EISDIR' ||
                err.errno === constants.EISDIR ||
                err.code === 'EINVAL' ||
                err.errno === constants.EINVAL
              ) {
                this.fileRedirectTargetUrl = urlTools.fsFilePathToFileUrl(
                  pathname.replace(/(\/)?$/, '/index.html')
                );
                this.isRedirect = true;
              } else {
                throw err;
              }
            }
          }
        } else if (protocol === 'http' || protocol === 'https') {
          const { headers = {}, ...requestOptions } =
            this.assetGraph.requestOptions || {};
          const firstIncomingRelation = this.incomingRelations[0];
          let Referer;

          if (
            firstIncomingRelation &&
            firstIncomingRelation.from.protocol &&
            firstIncomingRelation.from.protocol.startsWith('http')
          ) {
            Referer = firstIncomingRelation.from.url;
          }

          const response = await this.assetGraph.teepee.request({
            ...requestOptions,
            headers: {
              ...headers,
              Referer
            },
            method: metadataOnly ? 'HEAD' : 'GET',
            url,
            json: false
          });
          this.statusCode = response.statusCode;
          if (!metadataOnly) {
            this._rawSrc = response.body;
            this._updateRawSrcAndLastKnownByteLength(this._rawSrc);
          }
          if (response.headers.location) {
            this.location = response.headers.location;
            this.isRedirect = true;
          }
          const contentTypeHeaderValue = response.headers['content-type'];
          if (contentTypeHeaderValue) {
            const matchContentType = contentTypeHeaderValue.match(
              /^\s*([\w\-+.]+\/[\w-+.]+)(?:\s|;|$)/i
            );
            if (matchContentType) {
              this.contentType = matchContentType[1].toLowerCase();

              const matchCharset = contentTypeHeaderValue.match(
                /;\s*charset\s*=\s*(['"]|)\s*([\w-]+)\s*\1(?:\s|;|$)/i
              );
              if (matchCharset) {
                this._encoding = matchCharset[2].toLowerCase();
              }
            } else {
              const err = new Error(
                `Invalid Content-Type response header received: ${contentTypeHeaderValue}`
              );
              err.asset = this;
              this.assetGraph.warn(err);
            }
          } else if (response.statusCode >= 200 && response.statusCode < 300) {
            const err = new Error('No Content-Type response header received');
            err.asset = this;
            this.assetGraph.warn(err);
          }
          if (response.headers.etag) {
            this.etag = response.headers.etag;
          }
          if (response.headers['cache-control']) {
            this.cacheControl = response.headers['cache-control'];
          }
          if (response.headers['content-security-policy']) {
            this.contentSecurityPolicy =
              response.headers['content-security-policy'];
          }
          if (response.headers['content-security-policy-report-only']) {
            this.contentSecurityPolicyReportOnly =
              response.headers['content-security-policy-report-only'];
          }
          for (const headerName of ['date', 'last-modified']) {
            if (response.headers[headerName]) {
              this[
                headerName.replace(/-([a-z])/, ($0, ch) => ch.toUpperCase())
              ] = new Date(response.headers[headerName]);
            }
          }
        } else if (!knownAndUnsupportedProtocols[protocol]) {
          const err = new Error(
            `No resolver found for protocol: ${protocol}\n\tIf you think this protocol should exist, please contribute it here:\n\thttps://github.com/Munter/schemes#contributing`
          );
          if (this.assetGraph) {
            this.assetGraph.warn(err);
          } else {
            throw err;
          }
        }
      }

      // Try to upgrade to a subclass based on the currently available type information:
      this._inferredType = undefined;
      let type = this._inferType();

      if (
        (!type || type === 'Image') &&
        (this._rawSrc || typeof this._text === 'string') &&
        !this.hasOwnProperty('contentType')
      ) {
        const detectedContentType = await determineFileType(
          this._rawSrc || this._text
        );
        if (detectedContentType) {
          if (detectedContentType !== 'text/plain') {
            // Setting text/plain explicitly here would fool _inferType later
            this.contentType = detectedContentType;
          }
          const typeFromDetectedContentType =
            AssetGraph.typeByContentType[this.contentType];
          if (typeFromDetectedContentType) {
            if (
              !type ||
              (type === 'Image' &&
                AssetGraph[typeFromDetectedContentType].prototype.isImage) ||
              (type === 'Font' &&
                AssetGraph[typeFromDetectedContentType].prototype.isFont)
            ) {
              type = typeFromDetectedContentType;
            }
          }
        }
      }
      this._tryUpgrade(type);

      this.emit('load', this);
      if (this.assetGraph) {
        this.populate(true);
      }
      return this;
    } catch (err) {
      err.message = err.message || err.code || err.name;
      const includingAssetUrls = this.incomingRelations.map(
        incomingRelation => {
          return incomingRelation.from.urlOrDescription;
        }
      );
      if (includingAssetUrls.length > 0) {
        err.message += `\nIncluding assets:\n    ${includingAssetUrls.join(
          '\n    '
        )}\n`;
      }
      err.asset = this;
      throw err;
    }
  }

  /**
   * The loaded state of the Asset
   *
   * @type {Boolean}
   */
  get isLoaded() {
    return (
      this._rawSrc !== undefined ||
      this._parseTree !== undefined ||
      this.isRedirect ||
      typeof this._text === 'string'
    );
  }

  /**
   * Get the first non-inline ancestor asset by following the
   * incoming relations, ie. the first asset that has a
   * url. Returns the asset itself if it's not inline, and null if
   * the asset is inline, but not in an AssetGraph.
   *
   * @type {?Asset}
   */
  get nonInlineAncestor() {
    if (!this.isInline) {
      return this;
    }
    if (
      this.incomingInlineRelation &&
      this.incomingInlineRelation.from !== this
    ) {
      return this.incomingInlineRelation.from.nonInlineAncestor;
    } else if (this.assetGraph) {
      const incomingRelations = this.incomingRelations.filter(
        r => r.from !== r._to
      );
      if (incomingRelations.length > 0) {
        return incomingRelations[0].from.nonInlineAncestor;
      }
    }
    return null;
  }

  /**
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
   * @type {String}
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
      this.url = this.url.replace(/(?:\.\w+)?([?#]|$)/, `${extension}$1`);
    } else if (typeof this._fileName === 'string') {
      this._fileName =
        pathModule.basename(this._fileName, this._extension) + extension;
    }
    this._extension = extension;
  }

  /**
   * The file name for the asset. It is automatically kept
   * in sync with the url, but preserved if the asset is inlined or
   * set to a value that ends with a slash.
   *
   * If updated, the url of the asset will also be updated.
   *
   * @type {String}
   */
  get fileName() {
    if (typeof this._fileName === 'string') {
      return this._fileName;
    }
  }

  set fileName(fileName) {
    if (!this.isInline) {
      this.url = this.url.replace(/[^/?#]*([?#]|$)/, `${fileName}$1`);
    }
    this._extension = pathModule.extname(fileName);
    this._baseName = pathModule.basename(fileName, this._extension);
    this._fileName = fileName;
  }

  /**
   * The file name for the asset, excluding the extension. It is automatically
   * kept in sync with the url, but preserved if the asset is inlined or
   * set to a value that ends with a slash.
   *
   * If updated, the url of the asset will also be updated.
   *
   * @type {String}
   */
  get baseName() {
    if (typeof this._baseName === 'string') {
      return this._baseName;
    }
  }

  set baseName(baseName) {
    if (!this.isInline) {
      this.url = this.url.replace(
        /[^/?#]*([?#]|$)/,
        `${baseName + this.extension}$1`
      );
    }
    this._fileName = baseName + this.extension;
  }

  /**
   * The path of the asset relative to the AssetGraph root.
   * Corresponds to a `new URL(...).pathName`
   *
   * If updated, the url of the asset will also be updated.
   *
   * @type {String}
   */
  get path() {
    const currentValue = this._path;
    if (typeof currentValue !== 'undefined') {
      return currentValue;
    }
    const url = this.url;
    if (url) {
      let value;
      if (url.startsWith(this.assetGraph.root)) {
        value = url.substr(this.assetGraph.root.length - 1);
      } else {
        value = new urlModule.URL(url).pathname;
      }
      return value.replace(/\/+[^/]+$/, '/') || '/';
    }
  }

  set path(value) {
    const url = this.url;
    if (url) {
      if (url.startsWith(this.assetGraph.root)) {
        this.url =
          this.assetGraph.root +
          value.replace(/^\//, '').replace(/\/?$/, '/') +
          (this.fileName || '');
      } else {
        const urlObj = new urlModule.URL(url);
        urlObj.pathname = value.replace(/\/?$/, '/') + (this.fileName || '');
        this.url = urlObj.toString();
      }
    } else if (this.isInline) {
      throw new Error('Cannot update the path of an inline asset');
    }
  }

  /**
   * The origin of the asset, `protocol://host`
   * Corresponds to `new URL(...).origin`
   *
   * For inlined assets, this will contain the origin
   * of the first non-inlined ancestor
   *
   * @type {String}
   */
  get origin() {
    const nonInlineAncestor = this.nonInlineAncestor;
    if (nonInlineAncestor) {
      const urlObj = urlModule.parse(nonInlineAncestor.url);
      if (urlObj) {
        return (
          urlObj.protocol + (urlObj.slashes ? '//' : '') + (urlObj.host || '')
        );
      }
    }
  }

  /**
   * Get or set the raw source of the asset.
   *
   * If the internal state has been changed since the asset was
   * initialized, it will automatically be reserialized when this
   * property is retrieved.
   *
   * @example
   * const htmlAsset = new AssetGraph().addAsset({
   *   type: 'Html',
   *   rawSrc: new Buffer('<html><body>Hello!</body></html>')
   * });
   * htmlAsset.parseTree.body.innerHTML = "Bye!";
   * htmlAsset.markDirty();
   * htmlAsset.rawSrc.toString(); // "<html><body>Bye!</body></html>"
   *
   * @type {Buffer}
   */
  get rawSrc() {
    if (this._rawSrc) {
      return this._rawSrc;
    }

    const err = new Error(`Asset.rawSrc getter: Asset isn't loaded: ${this}`);
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

  /**
   * The `data:`-url of the asset for inlining
   *
   * @type {String}
   */
  get dataUrl() {
    if (this.isText) {
      const text = this.text;
      const urlEncodedText = encodeURIComponent(text).replace(/%2C/g, ',');
      const isUsAscii = !/[\x80-\uffff]/.test(text);
      const charsetParam = isUsAscii ? '' : ';charset=UTF-8';
      if (
        urlEncodedText.length + charsetParam.length <
        ';base64'.length + this.rawSrc.length * 1.37
      ) {
        return `data:${this.contentType}${
          isUsAscii ? '' : ';charset=UTF-8'
        },${urlEncodedText}`;
      }
    }
    // Default to base64 encoding:
    return `data:${this.contentType};base64,${this.rawSrc.toString('base64')}`;
  }

  _updateRawSrcAndLastKnownByteLength(rawSrc) {
    this._rawSrc = rawSrc;
    this._lastKnownByteLength = rawSrc.length;
  }

  /**
   * Get the last known byt length of the Asset
   *
   * Doesn't force a serialization of the asset if a value has previously been recorded.
   *
   * @type {Number}
   */
  get lastKnownByteLength() {
    if (this._rawSrc) {
      return this._rawSrc.length;
    } else if (typeof this._lastKnownByteLength === 'number') {
      return this._lastKnownByteLength;
    } else {
      return this.rawSrc.length; // Force the rawSrc to be computed
    }
  }

  /**
   * Externalize an inlined Asset.
   *
   * This will create an URL from as many available URL parts as possible and
   * auto generate the rest, then assign the URL to the Asset
   */
  externalize() {
    let urlObj;
    if (typeof this._path === 'string') {
      urlObj = new urlModule.URL(
        this.assetGraph.root + this._path.replace(/^\//, '')
      );
    } else {
      urlObj = new urlModule.URL(this.assetGraph.root);
    }
    for (const urlPropertyName of [
      'username',
      'password',
      'hostname',
      'port',
      'protocol'
    ]) {
      const value = this[`_${urlPropertyName}`];
      if (typeof value !== 'undefined') {
        urlObj[urlPropertyName] = value;
      }
    }

    let baseName;
    let extension;
    if (typeof this._fileName === 'string') {
      extension = pathModule.extname(this._fileName);
      baseName = pathModule.basename(this._fileName, extension);
    } else {
      baseName = this.baseName || this.id;
      extension = this.extension;
      if (typeof extension === 'undefined') {
        extension = this.defaultExtension;
      }
    }
    if (this._query) {
      urlObj.search = this._query;
    }
    const pathnamePrefix = urlObj.pathname.replace(/\/+[^/]+$/, '/') || '/';
    urlObj.pathname = pathnamePrefix + baseName + extension;
    this.url = urlObj.toString();
  }

  /**
   * Unload the asset body. If the asset is in a graph, also
   * remove the relations from the graph along with any inline
   * assets.
   * Also used internally to clean up before overwriting
   * .rawSrc or .text.
   */
  unload() {
    this._unpopulate();
    this._rawSrc = undefined;
    this._text = undefined;
    this._parseTree = undefined;
  }

  /**
   * Get the current md5 hex of the asset.
   *
   * @type {String}
   */
  get md5Hex() {
    if (!this._md5Hex) {
      this._md5Hex = crypto
        .createHash('md5')
        .update(this.rawSrc)
        .digest('hex');
    }
    return this._md5Hex;
  }

  /**
   * Get or set the absolute url of the asset.
   *
   * The url will use the `file:` schema if loaded from disc. Will be
   * falsy for inline assets.
   *
   * @type {String}
   */
  get url() {
    return this._url;
  }

  _updateUrlIndex(newUrl, oldUrl) {
    if (this.assetGraph) {
      if (oldUrl) {
        if (this.assetGraph._urlIndex[oldUrl] !== this) {
          throw new Error(`${oldUrl} was not in the _urlIndex`);
        }
        delete this.assetGraph._urlIndex[oldUrl];
      }
      if (newUrl) {
        if (this.assetGraph._urlIndex[newUrl]) {
          if (this.assetGraph._urlIndex[newUrl] !== this) {
            throw new Error(
              `${newUrl} already exists in the graph, cannot update url`
            );
          }
        } else {
          this.assetGraph._urlIndex[newUrl] = this;
        }
      }
    }
  }

  set url(url) {
    if (!this.isExternalizable) {
      throw new Error(
        `${this.toString()} cannot set url of non-externalizable asset`
      );
    }
    const oldUrl = this._url;
    if (url && !/^[a-z+]+:/.test(url)) {
      // Non-absolute
      const baseUrl =
        oldUrl ||
        (this.assetGraph && this.baseAsset && this.baseUrl) ||
        (this.assetGraph && this.assetGraph.root);
      if (!baseUrl) {
        throw new Error(
          `Cannot find base url for resolving new url of ${
            this.urlOrDescription
          } to non-absolute: ${url}`
        );
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
      const existingAsset = this.assetGraph._urlIndex[url];
      if (existingAsset) {
        // Move the existing asset at that location out of the way

        let nextSuffixToTry = 1;
        let newUrlForExistingAsset;
        do {
          const urlObj = new URL(url);
          urlObj.pathname = urlObj.pathname.replace(
            /([^/]*?)(\.[^/]*)?$/,
            ($0, $1, $2) => `${$1}-${nextSuffixToTry}${$2 || ''}`
          );
          newUrlForExistingAsset = urlObj.toString();
          nextSuffixToTry += 1;
        } while (this.assetGraph._urlIndex[newUrlForExistingAsset]);
        existingAsset.url = newUrlForExistingAsset;
      }
      this._url = url;
      this._query = undefined;
      this._updateUrlIndex(url, oldUrl);
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
        for (const incomingRelation of this.assetGraph.findRelations({
          to: this
        })) {
          incomingRelation.refreshHref();
        }
        for (const relation of this.externalRelations) {
          relation.refreshHref();
        }
      }
    }
  }

  /**
   * Determine whether the asset is inline (shorthand for checking
   * whether it has a url).
   *
   * @type {Boolean}
   */
  get isInline() {
    return !this.url;
  }

  /**
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
   * @return {Asset} The asset itself (chaining-friendly)
   */
  markDirty() {
    this.isDirty = true;
    if (typeof this._text === 'string' || this._parseTree !== undefined) {
      this._rawSrc = undefined;
    }
    this._md5Hex = undefined;
    if (this.isInline && this.assetGraph && this.incomingInlineRelation) {
      // Cascade dirtiness to containing asset and re-inline
      if (this.incomingInlineRelation.from !== this) {
        this.incomingInlineRelation.inline();
      }
    }
    return this;
  }

  _vivifyRelation(outgoingRelation) {
    outgoingRelation.from = this;
    if (!outgoingRelation.isRelation) {
      let originalHref = outgoingRelation.href;
      if (typeof originalHref === 'string') {
        outgoingRelation.to = { url: originalHref };
        delete outgoingRelation.href;
      }
      const type = outgoingRelation.type;
      delete outgoingRelation.type;
      outgoingRelation = new AssetGraph[type](outgoingRelation);
      // Make sure that we preserve the href of relations that maintain it as a direct property
      // rather than a getter/setter:
      if (typeof originalHref === 'string' && !('href' in outgoingRelation)) {
        outgoingRelation.href = originalHref;
      }
      if (outgoingRelation.to && this.assetGraph) {
        if (/^#/.test(outgoingRelation.to.url)) {
          // Self-reference, only fragment
          // Might need refinement for eg. url(#foo) in SvgStyle in inline Svg
          outgoingRelation._to = this;
        } else {
          // Implicitly create the target asset:
          outgoingRelation._to = this.assetGraph.addAsset(
            outgoingRelation.to,
            outgoingRelation
          );
        }
      }
    }
    return outgoingRelation;
  }

  /**
   * Get/set the outgoing relations of the asset.
   *
   * @type {Relation[]}
   */
  get outgoingRelations() {
    if (!this._outgoingRelations) {
      this._outgoingRelations = this.findOutgoingRelationsInParseTree().map(
        outgoingRelation => this._vivifyRelation(outgoingRelation)
      );
    }
    return this._outgoingRelations;
  }

  set outgoingRelations(outgoingRelations) {
    this._outgoingRelations = outgoingRelations.map(outgoingRelation =>
      this._vivifyRelation(outgoingRelation)
    );
  }

  /**
   * Attaches a Relation to the Asset.
   *
   * The ordering of certain relation types is significant
   * (`HtmlScript`, for instance), so it's important that the order
   * isn't scrambled in the indices. Therefore the caller must
   * explicitly specify a position at which to insert the object.
   *
   * @param {Relation} relation The Relation to attach to the Asset
   * @param {String} [position='last'] `"first"`, `"last"`, `"before"`, or `"after"`
   * @param {Relation} [adjacentRelation] The adjacent relation, mandatory if the position is `"before"` or `"after"`
   */
  addRelation(relation, position, adjacentRelation) {
    relation = this._vivifyRelation(relation);
    position = position || 'last';
    if (typeof relation.node === 'undefined' && relation.attach) {
      relation.attach(position, adjacentRelation);
    } else {
      relation.addToOutgoingRelations(position, adjacentRelation);
      relation.refreshHref();
    }
    // Smells funny, could be moved to Asset#_vivifyRelation?
    if (relation._hrefType === 'inline' || !relation.to.url) {
      relation._hrefType = undefined;
      relation.inline();
    }
    this.assetGraph.emit('addRelation', relation); // Consider getting rid of this
    return relation;
  }

  /**
   * Remove an outgoing Relation from the Asset by reference
   *
   * @param  {Relation} relation Outgoing Relation
   * @return {Asset} The Asset itself
   */
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

  /**
   * The subset of outgoing Relations that point to external (non-inlined) Assets
   *
   * @type {Relation[]}
   */
  get externalRelations() {
    const externalRelations = [];
    const seenAssets = new Set();
    (function gatherExternalRelations(asset) {
      if (asset.keepUnpopulated || seenAssets.has(asset)) {
        return;
      }
      seenAssets.add(asset);
      for (const outgoingRelation of asset.outgoingRelations) {
        if (outgoingRelation.to.isInline) {
          gatherExternalRelations(outgoingRelation.to);
        } else {
          externalRelations.push(outgoingRelation);
        }
      }
    })(this);
    return externalRelations;
  }

  /**
   * Parse the Asset for outgoing relations and return them.
   *
   * @return {Relation[]} The Assets outgoing Relations
   */
  findOutgoingRelationsInParseTree() {
    const outgoingRelations = [];
    if (
      typeof this.statusCode === 'number' &&
      this.statusCode >= 301 &&
      this.statusCode <= 303 &&
      this.location !== undefined
    ) {
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
   * Get/set the relations pointing to this asset
   *
   * **Caveat**: Setting Does not remove/detach other relations already pointing at the
   * asset, but not included in the array, so it's not strictly symmetric
   * with the incomingRelations getter.
   *
   * @type {Relation[]}
   */
  get incomingRelations() {
    if (!this.assetGraph) {
      throw new Error(
        'Asset.incomingRelations getter: Asset is not part of an AssetGraph'
      );
    }
    if (this.incomingInlineRelation) {
      return [this.incomingInlineRelation];
    } else {
      return this.assetGraph.findRelations({ to: this });
    }
  }
  set incomingRelations(incomingRelations) {
    for (const relation of incomingRelations) {
      relation.to = this;
    }
  }

  _updateQueryString(obj) {
    const url = this.url;
    const queryString = qs.stringify(obj);
    if (url) {
      const urlObj = urlModule.parse(url);
      if (queryString.length > 0) {
        urlObj.search = `?${queryString}`;
      } else {
        urlObj.search = '';
      }
      this.url = urlObj.format();
    } else {
      this._query = queryString;
    }
  }

  /**
   * The query parameters part of the Assets URL.
   *
   * Can be set with a `String` or `Object`, but always returns `String` in the getters
   *
   * @type {String}
   */
  get query() {
    if (!this._query && !this.isInline) {
      this._query = new Proxy(qs.parse(urlModule.parse(this.url).query), {
        get(target, parameterName) {
          return target[parameterName];
        },

        set: (target, parameterName, value) => {
          target[parameterName] = String(value);
          this._updateQueryString(target);
        },

        deleteProperty: (target, parameterName) => {
          delete target[parameterName];
          this._updateQueryString(target);
        }
      });
    }
    return this._query;
  }

  set query(query) {
    if (typeof query === 'string') {
      query = qs.parse(query.replace(/^\?/, ''));
    }
    this._updateQueryString(query);
  }

  /**
   * The username part of a URL `protocol://<username>:password@hostname:port/`
   *
   * @member {String} Asset#username
   */

  /**
   * The password part of a URL `protocol://username:<password>@hostname:port/`
   *
   * @member {String} Asset#password
   */

  /**
   * The hostname part of a URL `protocol://username:password@<hostname>:port/`
   *
   * @member {String} Asset#hostname
   */

  /**
   * The port part of a URL `protocol://username:password@hostname:<port>/`
   *
   * @member {Number} Asset#port
   */

  /**
   * The protocol part of a URL `<protocol:>//username:password@hostname:port/`.
   * Includes trailing `:`
   *
   * @member {String} Asset#protocol
   */

  /**
   * Go through the outgoing relations of the asset and add the ones
   * that refer to assets that are already part of the
   * graph. Recurses into inline assets.
   *
   * You shouldn't need to call this manually.
   */
  populate(force = false) {
    if (!this.assetGraph) {
      throw new Error('Asset.populate: Asset is not part of an AssetGraph');
    }
    if (
      (force || this.isLoaded) &&
      !this.keepUnpopulated &&
      !this.isPopulated
    ) {
      // eslint-disable-next-line no-unused-expressions
      this.outgoingRelations; // For the side effects
      this.isPopulated = true;
    }
  }

  _unpopulate() {
    if (this._outgoingRelations) {
      // Remove inline assets and outgoing relations:
      if (this.assetGraph && this.isPopulated) {
        const outgoingRelations = [...this._outgoingRelations];

        for (const outgoingRelation of outgoingRelations) {
          if (outgoingRelation.hrefType === 'inline') {
            // Remove inline asset
            this.assetGraph.removeAsset(outgoingRelation.to);
          }
        }
      }
      this._outgoingRelations = undefined;
    }
    this.isPopulated = false;
  }

  /**
   * Replace the asset in the graph with another asset, then remove
   * it from the graph.
   *
   * Updates the incoming relations of the old asset to point at the
   * new one and preserves the url of the old asset if it's not
   * inline.
   *
   * @param {Asset} newAsset The asset to put replace this one with.
   * @return {Asset} The new asset.
   */
  replaceWith(newAsset) {
    const thisUrl = this.url;
    if (thisUrl && (!newAsset.url || newAsset.isAsset)) {
      this._updateUrlIndex(undefined, thisUrl);
      this._url = undefined;
      newAsset.url = thisUrl;
    }
    newAsset = this.assetGraph.addAsset(newAsset);
    for (const incomingRelation of this.incomingRelations) {
      incomingRelation.to = newAsset;
    }
    this.assetGraph.removeAsset(this);
    return newAsset;
  }

  /**
   * Clone this asset instance and add the clone to the graph if
   * this instance is part of a graph. As an extra service,
   * optionally update some caller-specified relations to point at
   * the clone.
   *
   * If this instance isn't inline, a url is made up for the clone.
   *
   * @param {Relation[]|Relation} incomingRelations (optional) Some incoming relations that should be pointed at the clone.
   * @return {Asset} The cloned asset.
   */
  clone(incomingRelations) {
    if (incomingRelations && !this.assetGraph) {
      throw new Error(
        "asset.clone(): incomingRelations not supported because asset isn't in a graph"
      );
    }
    // TODO: Clone more metadata
    const constructorOptions = {
      isInitial: this.isInitial,
      _toBeMinified: this._toBeMinified,
      isPretty: this.isPretty,
      isDirty: this.isDirty,
      extension: this.extension,
      lastKnownByteLength: this.lastKnownByteLength,
      serializationOptions:
        this.serializationOptions &&
        Object.assign({}, this.serializationOptions)
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
        constructorOptions.url = this.assetGraph.resolveUrl(
          this.url,
          baseName + (nextSuffixToTry ? `-${nextSuffixToTry}` : '') + extension
        );
        nextSuffixToTry += 1;
      } while (this.assetGraph._urlIndex[constructorOptions.url]);
    }
    const clone = new this.constructor(constructorOptions, this.assetGraph);

    this.assetGraph.addAsset(clone);
    if (!this.isInline) {
      clone.externalize(this.url);
    }
    if (incomingRelations) {
      if (!Array.isArray(incomingRelations)) {
        incomingRelations = [incomingRelations];
      }
      for (const incomingRelation of incomingRelations) {
        if (!incomingRelation || !incomingRelation.isRelation) {
          throw new Error(
            `asset.clone(): Incoming relation is not a relation: ${incomingRelation.toString()}`
          );
        }
        incomingRelation.to = clone;
      }
    }
    return clone;
  }

  /**
   * Get a brief text containing the type, id, and url (if not inline) of the asset.
   *
   * @return {String} The string, eg. "[JavaScript/141 file:///the/thing.js]"
   */
  toString() {
    return `[${this.type}/${this.id} ${this.urlOrDescription}]`;
  }

  /**
   * A Human readable URL or Asset description if inline.
   * Paths for `file://` URL's are kept relative to the current
   * working directory for easier copy/paste if needed.
   *
   * @type {String}
   */
  get urlOrDescription() {
    function makeRelativeToCwdIfPossible(url) {
      if (/^file:\/\//.test(url)) {
        return pathModule.relative(
          process.cwd(),
          urlTools.fileUrlToFsPath(url)
        );
      } else {
        return url;
      }
    }
    return this.url
      ? makeRelativeToCwdIfPossible(this.url)
      : `inline ${this.type}${
          this.nonInlineAncestor
            ? ` in ${makeRelativeToCwdIfPossible(this.nonInlineAncestor.url)}`
            : ''
        }`;
  }
}

for (const urlPropertyName of [
  'username',
  'password',
  'hostname',
  'port',
  'protocol'
]) {
  Object.defineProperty(Asset.prototype, urlPropertyName, {
    get() {
      const currentValue = this[`_${urlPropertyName}`];
      if (typeof currentValue !== 'undefined') {
        return currentValue;
      }
      const url = this.url;
      if (url) {
        let value = new urlModule.URL(url)[urlPropertyName];
        if (urlPropertyName === 'port') {
          if (value) {
            value = parseInt(value, 10);
          } else {
            value = undefined;
          }
        }
        return value;
      }
    },

    set(value) {
      const url = this.url;
      if (url) {
        const urlObj = new urlModule.URL(url);
        urlObj[urlPropertyName] = value;
        this.url = urlObj.toString();
      } else if (this.isInline) {
        throw new Error(
          `Cannot update the ${urlPropertyName} of an inline asset`
        );
      }
    }
  });
}

Object.assign(Asset.prototype, {
  /**
   * Boolean Property that's true for all Asset instances. Avoids
   * reliance on the `instanceof` operator.
   *
   * @constant
   * @type {Boolean}
   * @memberOf Asset#
   * @default true
   */
  isAsset: true,

  isResolved: true,

  isRedirect: false,

  /**
   * Whether the asset occurs in a context where it can be
   * made external. If false, the asset will stay inline. Useful for
   * "always inline" assets pointed to by {@link HtmlConditionalComment},
   * {@link HtmlDataBindAttribute}, and {@link HtmlKnockoutContainerless}
   * relations. Override when creating the asset.
   *
   * @type {Boolean}
   * @memberOf Asset#
   * @default true
   */
  isExternalizable: true,

  /**
   * The Content-Type (MIME type) of the asset.
   *
   * @type {String}
   * @memberOf Asset#
   * @default 'appliction/octet-stream'
   */
  contentType: 'application/octet-stream'
});

module.exports = Asset;
