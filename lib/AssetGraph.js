/**
 * @class AssetGraph
 * @extends EventEmitter
 */
const util = require('util');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const os = require('os');
const constants = process.ENOENT ? process : require('constants');
const determineFileType = require('./util/determineFileType');
const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const pathModule = require('path');
const Teepee = require('teepee');
const resolveDataUrl = require('./util/resolveDataUrl');
const extendDefined = require('./util/extendDefined');
const urlTools = require('urltools');
const normalizeUrl = require('normalizeurl').create({leaveAlone: ',&+'}); // Don't turn ?rotate&resize=10,10 into ?rotate%26resize=10%2C10
const TransformQueue = require('./TransformQueue');
const knownAndUnsupportedProtocols = require('schemes').allByName;
const errors = require('./errors');

/**
 * new AssetGraph([options])
 * =========================
 *
 * Create a new AssetGraph instance.
 *
 * Options:
 *
 *  - `root` (optional) The root URL of the graph, either as a fully
 *           qualified `file:` or `http:` url or file system
 *           path. Defaults to the current directory,
 *           ie. `file://<process.cwd()>/`. The purpose of the root
 *           option is to allow resolution of root-relative urls
 *           (eg. `<a href="/foo.html">`) from `file:` locations.
 *
 * Examples:
 *
 *     new AssetGraph()
 *         // => root: "file:///current/working/dir/"
 *
 *     new AssetGraph({root: '/absolute/fs/path'});
 *         // => root: "file:///absolute/fs/path/"
 *
 *     new AssetGraph({root: 'relative/path'})
 *         // => root: "file:///current/working/dir/relative/path/"
 *
 * @constructor AssetGraph
 * @param {Object} options
 * @api public
 */
class AssetGraph extends EventEmitter {
    constructor(options) {
        super();

        options = options || {};

        if (!(this instanceof AssetGraph)) {
            return new AssetGraph(options);
        }

        this.isAssetGraph = true;

        if (typeof options.canonicalRoot !== 'undefined') {
            if (typeof options.canonicalRoot !== 'string') {
                throw new Error('AssetGraph: options.canonicalRoot must be a URL string');
            }

            // Validate that the given canonicalRoot is actually a URL
            // regexes lifted from one-validation fragments.domainPart and fragments.tld
            if (!(/^(?:https?:)?\/\/[a-z0-9](?:[\-a-z0-9]*[a-z0-9])?\.[a-z][\-a-z]*[a-z]/i).test(options.canonicalRoot)) {
                throw new Error('AssetGraph: options.canonicalRoot must be a URL string');
            }

            // Ensure trailing slash on canonical root
            if (options.canonicalRoot[options.canonicalRoot.length - 1] !== '/') {
                options.canonicalRoot += '/';
            }
        }

        _.extend(this, options);

        // this.root might be undefined, in which case urlTools.urlOrFsPathToUrl will use process.cwd()
        this.root = normalizeUrl(urlTools.urlOrFsPathToUrl(this.root, true)); // ensureTrailingSlash

        this._assets = [];
        this.idIndex = {};

        this.teepee = new Teepee({
            retry: [ 'selfRedirect', '5xx' ],
            headers: {
                'User-Agent': 'AssetGraph v' + require('../package.json').version + ' (https://www.npmjs.com/package/assetgraph)'
            }
        });
    }

    /**
     * assetGraph.root
     * ===============
     *
     * The absolute root url of the graph, always includes a trailing
     * slash. A normalized version of the `root` option provided to
     * the constructor.
     */

    /**
     * assetGraph.addAsset(asset)
     * ==========================
     *
     * Add an asset to the graph.
     *
     * @param {Asset} asset The asset to add.
     * @return {AssetGraph} The AssetGraph instance (chaining-friendly).
     * @api public
     */
    addAsset(asset) {
        if (Array.isArray(asset)) {
            for (const _asset of asset) {
                this.addAsset(_asset);
            }
            return;
        }
        if (!asset || typeof asset !== 'object') {
            throw new Error('AssetGraph.addAsset: ' + asset + ' is not an asset or an asset config object');
        }
        if (!asset.isAsset) {
            asset = this.createAsset(asset);
        }
        if (this.idIndex[asset.id]) {
            throw new Error('AssetGraph.addAsset: ' + asset + ' is already in graph (id already in idIndex)');
        }
        this.idIndex[asset.id] = asset;
        this._assets.push(asset);
        asset.assetGraph = this;
        asset.isPopulated = false;
        this.emit('addAsset', asset);
        asset.populate();
        return this;
    }

    /**
     * assetGraph.removeAsset(asset[, detachIncomingRelations])
     * ========================================================
     *
     * Remove an asset from the graph. Also removes the incoming and
     * outgoing relations of the asset.
     *
     * @param {Asset} asset The asset to remove.
     * @param {Boolean} detachIncomingRelations Whether to also detach the incoming relations before removal (defaults to false).
     * @return {AssetGraph} The AssetGraph instance (chaining-friendly).
     */
    removeAsset(asset, detachIncomingRelations) {
        if (!this.idIndex[asset.id]) {
            throw new Error('AssetGraph.removeAsset: ' + asset + ' not in graph');
        }
        if (asset._outgoingRelations) {
            for (const outgoingRelation of [].concat(asset.outgoingRelations)) {
                if (outgoingRelation.to.isAsset && outgoingRelation.to.isInline) {
                    // Remove inline asset
                    this.removeAsset(outgoingRelation.to);
                }
            }
        }
        for (const incomingRelation of this.findRelations({to: asset})) {
            if (detachIncomingRelations) {
                incomingRelation.detach();
            } else {
                incomingRelation.remove();
            }
        }
        var assetIndex = this._assets.indexOf(asset);
        if (assetIndex === -1) {
            throw new Error('removeAsset: ' + asset + ' not in graph');
        } else {
            this._assets.splice(assetIndex, 1);
        }
        this.idIndex[asset.id] = undefined;
        asset.assetGraph = undefined;
        this.emit('removeAsset', asset);
        return this;
    }

    /**
     * assetGraph.findAssets([queryObj])
     * =================================
     *
     * Query assets in the graph.
     *
     * Example usage:
     *
     *     var allAssetsInGraph = ag.findAssets();
     *
     *     var htmlAssets = ag.findAssets({type: 'Html'});
     *
     *     var localImageAssets = ag.findAssets({
     *         url: /^file:.*\.(?:png|gif|jpg)$/
     *     });
     *
     *     var orphanedJavaScriptAssets = ag.findAssets(function (asset) {
     *         return asset.type === 'JavaScript' &&
     *                ag.findRelations({to: asset}).length === 0;
     *     });
     *
     *     var textBasedAssetsOnGoogleCom = ag.findAssets({
     *         isText: true,
     *         url: /^https?:\/\/(?:www\.)google\.com\//
     *     });
     *
     * @param {Object} queryObj (optional). Will match all assets if not provided.
     * @return {Array} The found assets.
     * @api public
     */
    findAssets(queryObj) {
        return AssetGraph.query.queryAssetGraph(this, 'asset', queryObj);
    }

    /**
     * assetGraph.findRelations([queryObj[, includeUnpopulated]])
     * =========================================================
     *
     * Query relations in the graph.
     *
     * Example usage:
     *
     *     var allRelationsInGraph = ag.findRelations();
     *
     *     var allHtmlScriptRelations = ag.findRelations({
     *         type: 'HtmlScript'
     *     });
     *
     *     var htmlAnchorsPointingAtLocalImages = ag.findRelations({
     *         type: 'HtmlAnchor',
     *         to: {isImage: true, url: /^file:/}
     *     });
     *
     * @param {Object} queryObj (optional). Will match all relations if not provided.
     * @param {Boolean} includeUnpopulated (optional). Whether to also consider relations that weren't followed during population. Defaults to false.
     * @return {Array} The found relations.
     * @api public
     */
    findRelations(queryObj, includeUnpopulated) {
        var sourceAssets;
        if (queryObj && typeof queryObj.from !== 'undefined') {
            if (queryObj.from && queryObj.from.isAsset) {
                sourceAssets = [queryObj.from];
            } else if (queryObj.from && Array.isArray(queryObj.from)) {
                sourceAssets = [];
                queryObj.from.forEach(function (fromEntry) {
                    if (fromEntry.isAsset) {
                        sourceAssets.push(fromEntry);
                    } else {
                        Array.prototype.push.apply(sourceAssets, this.findAssets(fromEntry));
                    }
                }, this);
                sourceAssets = _.uniq(sourceAssets);
            } else {
                sourceAssets = this.findAssets(queryObj.from);
            }
        } else {
            sourceAssets = this._assets;
        }
        var candidateRelations = [];
        for (const sourceAsset of sourceAssets) {
            if (sourceAsset.isLoaded && sourceAsset._outgoingRelations) {
                candidateRelations.push(...sourceAsset.outgoingRelations);
            }
        }
        var relations = AssetGraph.query.queryAssetGraph(this, 'relation', queryObj, candidateRelations);
        if (includeUnpopulated) {
            return relations;
        } else {
            return relations.filter(function (relation) {
                return relation.to.isAsset;
            });
        }
    }

    resolveAssetConfig(assetConfig, fromUrl) {
        if (typeof assetConfig === 'string') {
            if (/^[a-zA-Z-\+]+:/.test(assetConfig)) {
                // Includes protocol, assume url
                assetConfig = {url: assetConfig};
            } else {
                // File system path
                assetConfig = {url: encodeURI(assetConfig)};
            }
        }
        var url = assetConfig.url;
        if (url) {
            if (!/^[a-zA-Z-\+]+:/.test(url)) {
                url = assetConfig.url = this.resolveUrl(fromUrl, url);
            }
            url = assetConfig.url = url.replace(/\#.*$/, '');

            if (this.canonicalRoot) {
                if (url.indexOf(this.canonicalRoot) === 0) {
                    url = url.replace(this.canonicalRoot, this.root);
                    assetConfig.url = url;
                }
            }

            var protocol = url.substr(0, url.indexOf(':')).toLowerCase();
            if (protocol === 'javascript') {
                assetConfig.text = url.replace(/^javascript:/i, '');
                assetConfig.type = 'JavaScript';
                assetConfig.isResolved = true;
                assetConfig.url = undefined;
            } else if (protocol === 'data') {
                var resolvedDataUrl = resolveDataUrl(url);
                if (resolvedDataUrl) {
                    assetConfig.url = undefined;
                    extendDefined(assetConfig, resolvedDataUrl);
                    assetConfig.isResolved = true;
                } else {
                    this.emit('warn', new errors.ParseError({
                        message: 'Cannot parse data url: ' + assetConfig.url,
                        asset: assetConfig
                    }));
                }
            } else if (protocol === 'file') {
                assetConfig.rawSrcProxy = function () {
                    // In case assetConfig.url was updated in the mean time
                    var url = this.url;
                    var pathname = urlTools.fileUrlToFsPath(url);
                    return fs.readFileAsync(pathname).then(function (rawSrc) {
                        return [rawSrc];
                    }, function (err) {
                        if (err.code === 'EISDIR' || err.errno === constants.EISDIR || err.code === 'EINVAL' || err.errno === constants.EINVAL) {
                            return fs.readFileAsync(pathname.replace(/(\/)?$/, '/index.html')).then(function (rawSrc) {
                                return [rawSrc, {url: url.replace(/(\/)?((?:[?#].*$)|$)/, '/index.html$2')}];
                            });
                        } else {
                            throw err;
                        }
                    });
                };
                assetConfig.isResolved = true;
            } else if (protocol === 'http' || protocol === 'https') {
                assetConfig.rawSrcProxy = () => {
                    return this.teepee.request(_.defaults({ url: url, json: false }, this.requestOptions)).then(response => {
                        var metadata = { statusCode: response.statusCode };
                        if (response.headers.location) {
                            metadata.location = response.headers.location;
                        }
                        var contentType = response.headers['content-type'];
                        if (contentType) {
                            var matchContentType = contentType.match(/^\s*([\w\-\+\.]+\/[\w\-\+\.]+)(?:\s|;|$)/i);
                            if (matchContentType) {
                                metadata.contentType = matchContentType[1].toLowerCase();
                                var matchCharset = contentType.match(/;\s*charset\s*=\s*(['"]|)\s*([\w\-]+)\s*\1(?:\s|;|$)/i);
                                if (matchCharset) {
                                    metadata.encoding = matchCharset[2].toLowerCase();
                                }
                            }
                        }
                        if (response.headers.etag) {
                            metadata.etag = response.headers.etag;
                        }
                        if (response.headers['cache-control']) {
                            metadata.cacheControl = response.headers['cache-control'];
                        }
                        if (response.headers['content-security-policy']) {
                            metadata.contentSecurityPolicy = response.headers['content-security-policy'];
                        }
                        if (response.headers['content-security-policy-report-only']) {
                            metadata.contentSecurityPolicyReportOnly = response.headers['content-security-policy-report-only'];
                        }
                        for (const headerName of ['date', 'last-modified']) {
                            if (response.headers[headerName]) {
                                metadata[headerName.replace(/-([a-z])/, function ($0, ch) {
                                    return ch.toUpperCase();
                                })] = new Date(response.headers[headerName]);
                            }
                        }
                        return [response.body, metadata];
                    });
                };
                assetConfig.isResolved = true;
            } else if (!knownAndUnsupportedProtocols[protocol]) {
                this.emit('warn', new Error(['No resolver found for protocol: ' + protocol, '\tIf you think this protocol should exist, please contribute it here:', '\thttps://github.com/Munter/schemes#contributing'].join('\n')));
            }
        }
        if (assetConfig.isAsset || assetConfig.isResolved) {
            // Almost done, add .type property if possible (this is all we can do without actually fetching the asset):
            assetConfig.type =
                assetConfig.type ||
                (assetConfig.contentType && AssetGraph.lookupContentType(assetConfig.contentType)) ||
                AssetGraph.typeByExtension[pathModule.extname(assetConfig.url.replace(/[\?\#].*$/, '')).toLowerCase()];
        }
        return assetConfig;
    }

    // Resolve a url while taking the root of the AssetGraph instance into account
    resolveUrl(fromUrl, url) {
        var that = this;
        if (/^\/(?:[^\/]|$)/.test(url) && /^file:/.test(fromUrl) && /^file:/.test(that.root)) {
            return urlTools.resolveUrl(that.root, url.substr(1));
        } else {
            return urlTools.resolveUrl(fromUrl, url);
        }
    }

    // Tricky business: Might also modify assetConfig.url and assetConfig.rawSrc
    ensureAssetConfigHasType(assetConfig) {
        if (assetConfig.isAsset || assetConfig.type) {
            return Promise.resolve(assetConfig);
        }
        // Looks like there's no way around loading the asset and looking at the src or metadata
        return (assetConfig.rawSrc ? Promise.resolve([assetConfig.rawSrc]) : assetConfig.rawSrcProxy()).then(([rawSrc, metadata]) => {
            assetConfig.rawSrc = rawSrc;
            if (metadata) {
                _.extend(assetConfig, metadata);
            }
            let foundType = type => {
                if (!type) {
                    this.emit('warn', new Error('AssetGraph.ensureAssetConfigHasType: Couldn\'t determine asset type from asset config: ' + util.inspect(assetConfig) + ', assuming AssetGraph.Asset'));
                }
                assetConfig.type = type || 'Asset';
                return assetConfig;
            };
            if (metadata && metadata.contentType) {
                // If the asset was served using HTTP, we shouldn't try to second guess by sniffing.
                return foundType(AssetGraph.lookupContentType(metadata.contentType));
            } else if (rawSrc.length === 0) {
                return foundType(); // Give up
            } else {
                return determineFileType(rawSrc).then(contentType => {
                    return foundType(AssetGraph.lookupContentType(contentType));
                }, err => {
                    this.emit('warn', 'Could not determine asset type from contents using the file command: ' + err.stack + '\nwith assetConfig: ' + util.inspect(assetConfig));
                    return foundType();
                });
            }
        })
        .catch(() => {
            this.emit('warn', new Error('AssetGraph.ensureAssetConfigHasType: Couldn\'t load ' + (assetConfig.url || util.inspect(assetConfig)) + ', assuming AssetGraph.Asset'));
            assetConfig.type = 'Asset';
            return assetConfig;
        });
    }

    // Traversal:

    eachAssetPreOrder(startAssetOrRelation, relationQueryObj, lambda) {
        if (!lambda) {
            lambda = relationQueryObj;
            relationQueryObj = null;
        }
        this._traverse(startAssetOrRelation, relationQueryObj, lambda);
    }

    eachAssetPostOrder(startAssetOrRelation, relationQueryObj, lambda) {
        if (!lambda) {
            lambda = relationQueryObj;
            relationQueryObj = null;
        }
        this._traverse(startAssetOrRelation, relationQueryObj, null, lambda);
    }

    _traverse(startAssetOrRelation, relationQueryObj, preOrderLambda, postOrderLambda) {
        var relationQueryMatcher = relationQueryObj && AssetGraph.query.createValueMatcher(relationQueryObj),
            startAsset,
            startRelation;
        if (startAssetOrRelation.isRelation) {
            startRelation = startAssetOrRelation;
            startAsset = startRelation.to;
        } else {
            // incomingRelation will be undefined when (pre|post)OrderLambda(startAsset) is called
            startAsset = startAssetOrRelation;
        }

        const seenAssets = {};
        const assetStack = [];
        let traverse = (asset, incomingRelation) => {
            if (!seenAssets[asset.id]) {
                if (preOrderLambda) {
                    preOrderLambda(asset, incomingRelation);
                }
                seenAssets[asset.id] = true;
                assetStack.push(asset);
                for (const relation of this.findRelations({from: asset})) {
                    if (!relationQueryMatcher || relationQueryMatcher(relation)) {
                        traverse(relation.to, relation);
                    }
                }
                var previousAsset = assetStack.pop();
                if (postOrderLambda) {
                    postOrderLambda(previousAsset, incomingRelation);
                }
            }
        };

        traverse(startAsset, startRelation);
    }

    collectAssetsPreOrder(startAssetOrRelation, relationQueryObj) {
        var assetsInOrder = [];
        this.eachAssetPreOrder(startAssetOrRelation, relationQueryObj, asset => {
            assetsInOrder.push(asset);
        });
        return assetsInOrder;
    }

    collectAssetsPostOrder(startAssetOrRelation, relationQueryObj) {
        var assetsInOrder = [];
        this.eachAssetPostOrder(startAssetOrRelation, relationQueryObj, asset => {
            assetsInOrder.push(asset);
        });
        return assetsInOrder;
    }

    // Transforms:
    _runTransform(transform, cb) {
        const startTime = new Date();
        const done = err => {
            if (err) {
                return cb(err);
            }
            this.emit('afterTransform', transform, new Date().getTime() - startTime);
            cb(null, this);
        };

        this.emit('beforeTransform', transform);

        if (transform.length < 2) {
            setImmediate(() => {
                var returnValue;
                try {
                    returnValue = transform(this);
                } catch (err) {
                    return done(err);
                }
                if (returnValue && typeof returnValue.then === 'function') {
                    returnValue.then(() => done(), done);
                } else {
                    done();
                }
            });
        } else {
            var callbackCalled = false;
            try {
                var returnValue = transform(this, err => {
                    if (callbackCalled) {
                        console.warn('AssetGraph._runTransform: The transform ' + transform.name + ' called the callback more than once!');
                    } else {
                        callbackCalled = true;
                        done(err);
                    }
                });
                if (returnValue && typeof returnValue.then === 'function') {
                    setImmediate(function () {
                        cb(new Error('A transform cannot both take a callback and return a promise'));
                    });
                }
            } catch (e) {
                setImmediate(() => cb(e));
            }
        }
        return this;
    }
};

module.exports = AssetGraph;

AssetGraph.typeByExtension = AssetGraph.prototype.typeByExtension = {};

AssetGraph.typeByContentType = AssetGraph.prototype.typeByContentType = {};

AssetGraph.lookupContentType = AssetGraph.prototype.lookupContentType = function (contentType) {
    if (contentType) {
        // Trim whitespace and semicolon suffixes such as ;charset=...
        contentType = contentType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase(); // Will always match
        if (AssetGraph.typeByContentType[contentType]) {
            return AssetGraph.typeByContentType[contentType];
        } else if (/\+xml$/i.test(contentType)) {
            var contentTypeWithoutXmlSuffix = contentType.replace(/\+xml$/i, '');
            return AssetGraph.typeByContentType[contentTypeWithoutXmlSuffix] || 'Xml';
        } else if (AssetGraph.typeByContentType[contentType + '+xml']) {
            return AssetGraph.typeByContentType[contentType + '+xml'];
        } else if (/^text\//i.test(contentType)) {
            return 'Text';
        } else {
            return 'Asset';
        }
    }
};

AssetGraph.createAsset = AssetGraph.prototype.createAsset = function (assetConfig) {
    if (!assetConfig.type) {
        throw new Error('AssetGraph.create: No type provided in assetConfig' + util.inspect(assetConfig));
    }
    if (assetConfig.isAsset) {
        return assetConfig;
    } else {
        return new AssetGraph[assetConfig.type](assetConfig);
    }
};

AssetGraph.query = AssetGraph.prototype.query = require('./query');

// Add AssetGraph helper methods that implicitly create a new TransformQueue:
for (const methodName of ['if', 'queue']) {
    AssetGraph.prototype[methodName] = function () { // ...
        var transformQueue = new TransformQueue(this);
        return transformQueue[methodName].apply(transformQueue, arguments);
    };
}

AssetGraph.prototype.if_ = AssetGraph.prototype.if;

AssetGraph.transforms = {};

AssetGraph.registerTransform = function (fileNameOrFunction, name) {
    if (typeof fileNameOrFunction === 'function') {
        name = name || fileNameOrFunction.name;
        AssetGraph.transforms[name] = fileNameOrFunction;
    } else {
        // File name
        name = name || pathModule.basename(fileNameOrFunction, '.js');
        fileNameOrFunction = pathModule.resolve(process.cwd(), fileNameOrFunction); // Absolutify if not already absolute
        AssetGraph.transforms.__defineGetter__(name, function () {
            return require(fileNameOrFunction);
        });
    }
    TransformQueue.prototype[name] = function () { // ...
        if (!this.conditions.length || this.conditions[this.conditions.length - 1]) {
            this.transforms.push(AssetGraph.transforms[name].apply(this, arguments));
        }
        return this;
    };
    // Make assetGraph.<transformName>(options) a shorthand for creating a new TransformQueue:
    AssetGraph.prototype[name] = function () { // ...
        var transformQueue = new TransformQueue(this);
        return transformQueue[name].apply(transformQueue, arguments);
    };
};

AssetGraph.registerAsset = function (Constructor, type) {
    type = type || Constructor.name;
    var prototype = Constructor.prototype;
    prototype.type = type;
    AssetGraph[type] = AssetGraph.prototype[type] = Constructor;
    Constructor.prototype['is' + type] = true;
    if (prototype.contentType && (!prototype.hasOwnProperty('notDefaultForContentType') || !prototype.notDefaultForContentType)) {
        if (AssetGraph.typeByContentType[prototype.contentType]) {
            console.warn(type + ': Redefinition of Content-Type ' + prototype.contentType);
            console.trace();
        }
        AssetGraph.typeByContentType[prototype.contentType] = type;
    }
    if (prototype.supportedExtensions) {
        for (const supportedExtension of prototype.supportedExtensions) {
            if (AssetGraph.typeByExtension[supportedExtension]) {
                console.warn(type + ': Redefinition of ' + supportedExtension + ' extension');
                console.trace();
            }
            AssetGraph.typeByExtension[supportedExtension] = type;
        }
    }
};

AssetGraph.registerRelation = function (fileNameOrConstructor, type) {
    if (typeof fileNameOrConstructor === 'function') {
        type = type || fileNameOrConstructor.name;
        fileNameOrConstructor.prototype.type = type;
        AssetGraph[type] = AssetGraph.prototype[type] = fileNameOrConstructor;
    } else {
        var fileNameRegex = (os.platform() === 'win32' ? /\\([^\\]+)\.js$/ : /\/([^\/]+)\.js$/);
        // Assume file name
        type = type || fileNameOrConstructor.match(fileNameRegex)[1];
        var getter = function () {
            var Constructor = require(fileNameOrConstructor);
            Constructor.prototype.type = type;
            return Constructor;
        };
        AssetGraph.__defineGetter__(type, getter);
        AssetGraph.prototype.__defineGetter__(type, getter);
    }
};

fs.readdirSync(pathModule.resolve(__dirname, 'transforms')).forEach(function (fileName) {
    AssetGraph.registerTransform(pathModule.resolve(__dirname, 'transforms', fileName));
});

fs.readdirSync(pathModule.resolve(__dirname, 'assets')).forEach(function (fileName) {
    if (/\.js$/.test(fileName) && fileName !== 'index.js') {
        AssetGraph.registerAsset(require(pathModule.resolve(__dirname, 'assets', fileName)));
    }
});

fs.readdirSync(pathModule.resolve(__dirname, 'relations')).forEach(function (fileName) {
    if (/\.js$/.test(fileName) && fileName !== 'index.js') {
        AssetGraph.registerRelation(pathModule.resolve(__dirname, 'relations', fileName));
    }
});
