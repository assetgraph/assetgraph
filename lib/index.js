/**
 * @class AssetGraph
 * @extends EventEmitter
 */
require('setimmediate');
var util = require('util'),
    fs = require('fs'),
    os = require('os'),
    childProcess = require('child_process'),
    _ = require('lodash'),
    EventEmitter = require('events').EventEmitter,
    seq = require('seq'),
    Path = require('path'),
    passError = require('passerror'),
    urlTools = require('urltools'),
    normalizeUrl = require('normalizeurl'),
    TransformQueue = require('./TransformQueue'),
    knownAndUnsupportedProtocols = require('schemes').allByName;

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
function AssetGraph(options) {
    if (!(this instanceof AssetGraph)) {
        return new AssetGraph(options);
    }
    EventEmitter.call(this);
    _.extend(this, options);

    // this.root might be undefined, in which case urlTools.urlOrFsPathToUrl will use process.cwd()
    this.root = normalizeUrl(urlTools.urlOrFsPathToUrl(this.root, true)); // ensureTrailingSlash

    this._assets = [];
    this._relations = [];
    this._objInBaseAssetPaths = {};
    this._relationsWithNoBaseAsset = [];
    this.idIndex = {};
    this.resolverByProtocol = {
        data: AssetGraph.resolvers.data(),
        file: AssetGraph.resolvers.file(),
        javascript: AssetGraph.resolvers.javascript(),
        http: AssetGraph.resolvers.http(),
        https: AssetGraph.resolvers.http()
    };
}

module.exports = AssetGraph;

util.inherits(AssetGraph, EventEmitter);

AssetGraph.typeByExtension = AssetGraph.prototype.typeByExtension = {};

AssetGraph.typeByContentType = AssetGraph.prototype.typeByContentType = {};

AssetGraph.lookupContentType = AssetGraph.prototype.lookupContentType = function (contentType) {
    if (contentType) {
        // Trim whitespace and semicolon suffixes such as ;charset=...
        contentType = contentType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase(); // Will always match
        if (contentType in AssetGraph.typeByContentType) {
            return AssetGraph.typeByContentType[contentType];
        } else if (/\+xml$/i.test(contentType)) {
            var contentTypeWithoutXmlSuffix = contentType.replace(/\+xml$/i, '');
            return AssetGraph.typeByContentType[contentTypeWithoutXmlSuffix] || 'Xml';
        } else if ((contentType + '+xml') in AssetGraph.typeByContentType) {
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
AssetGraph.resolvers = require('./resolvers');

_.extend(AssetGraph.prototype, {
    /**
     * assetGraph.root
     * ===============
     *
     * The absolute root url of the graph, always includes a trailing
     * slash. A normalized version of the `root` option provided to
     * the constructor.
     */

    /**
     * Avoid instanceof checks:
     */
    isAssetGraph: true,

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
    addAsset: function (asset) {
        if (Array.isArray(asset)) {
            asset.forEach(function (_asset) {
                this.addAsset(_asset);
            }, this);
            return;
        }
        if (!asset || typeof asset !== 'object') {
            throw new Error('AssetGraph.addAsset: ' + asset + ' is not an asset or an asset config object');
        }
        if (!asset.isAsset) {
            asset = this.createAsset(asset);
        }
        if (asset.id in this.idIndex) {
            throw new Error('AssetGraph.addAsset: ' + asset + ' is already in graph (id already in idIndex)');
        }
        this.idIndex[asset.id] = asset;
        this._assets.push(asset);
        this._objInBaseAssetPaths[asset.id] = [];
        asset.assetGraph = this;
        asset.isPopulated = false;
        this.emit('addAsset', asset);
        asset.populate();
        return this;
    },

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
    removeAsset: function (asset, detachIncomingRelations) {
        if (!(asset.id in this.idIndex)) {
            throw new Error('AssetGraph.removeAsset: ' + asset + ' not in graph');
        }
        asset._outgoingRelations = this.findRelations({from: asset}, true);
        asset._outgoingRelations.forEach(function (outgoingRelation) {
            this.removeRelation(outgoingRelation);
            if (outgoingRelation.to.isAsset && outgoingRelation.to.isInline) {
                // Remove inline asset
                this.removeAsset(outgoingRelation.to);
            }
        }, this);
        this.findRelations({to: asset}).forEach(function (incomingRelation) {
            if (detachIncomingRelations) {
                incomingRelation.detach();
            } else {
                incomingRelation.remove();
            }
        }, this);
        var affectedRelations = [].concat(this._objInBaseAssetPaths[asset.id]);
        affectedRelations.forEach(function (affectedRelation) {
            affectedRelation._unregisterBaseAssetPath();
        }, this);
        delete this._objInBaseAssetPaths[asset.id];
        var assetIndex = this._assets.indexOf(asset);
        if (assetIndex === -1) {
            throw new Error('removeAsset: ' + asset + ' not in graph');
        } else {
            this._assets.splice(assetIndex, 1);
        }
        delete this.idIndex[asset.id];
        affectedRelations.forEach(function (affectedRelation) {
            affectedRelation._registerBaseAssetPath();
        }, this);
        delete asset.assetGraph;
        this.emit('removeAsset', asset);
        return this;
    },

    /**
     * assetGraph.addRelation(relation, position[, adjacentRelation])
     * ==============================================================
     *
     * Add a relation to the graph.
     *
     * The ordering of certain relation types is significant
     * (`HtmlScript`, for instance), so it's important that the order
     * isn't scrambled in the indices. Therefore the caller must
     * explicitly specify a position at which to insert the object.
     *
     * @param {Relation} relation The relation to add to the graph.
     * @param {String} position "first", "last", "before", or "after".
     * @param {Relation} adjacentRelation The adjacent relation, mandatory if position is "before" or "after".
     * @return {AssetGraph} The AssetGraph instance (chaining-friendly).
     * @api private
     */
    addRelation: function (relation, position, adjacentRelation) { // position and adjacentRelation are optional
        if (Array.isArray(relation)) {
            relation.forEach(function (_relation) {
                this.addRelation(_relation, position, adjacentRelation);
            }, this);
            return;
        }
        if (!relation || !relation.id || !relation.isRelation) {
            throw new Error('AssetGraph.addRelation: Not a relation: ' + relation);
        }
        if (relation.id in this.idIndex) {
            throw new Error('AssetGraph.addRelation: Relation already in graph: ' + relation);
        }
        if (!relation.from || !relation.from.isAsset) {
            throw new Error('AssetGraph.addRelation: \'from\' property of relation is not an asset: ' + relation.from);
        }
        if (!(relation.from.id in this.idIndex)) {
            throw new Error('AssetGraph.addRelation: \'from\' property of relation is not in the graph: ' + relation.from);
        }
        if (!relation.to) {
            throw new Error('AssetGraph.addRelation: \'to\' property of relation is missing');
        }
        position = position || 'last';
        relation.assetGraph = this;
        if (position === 'last') {
            this._relations.push(relation);
        } else if (position === 'first') {
            this._relations.unshift(relation);
        } else if (position === 'before' || position === 'after') { // Assume 'before' or 'after'
            if (!adjacentRelation || !adjacentRelation.isRelation) {
                throw new Error('AssetGraph.addRelation: Adjacent relation is not a relation: ' + adjacentRelation);
            }
            var i = this._relations.indexOf(adjacentRelation) + (position === 'after' ? 1 : 0);
            if (i === -1) {
                throw new Error('AssetGraph.addRelation: Adjacent relation is not in the graph: ' + adjacentRelation);
            }
            this._relations.splice(i, 0, relation);
        } else {
            throw new Error('AssetGraph.addRelation: Illegal \'position\' argument: ' + position);
        }
        this.idIndex[relation.id] = relation;
        this._objInBaseAssetPaths[relation.id] = [];
        relation._registerBaseAssetPath();
        this.emit('addRelation', relation);
        return this;
    },

    /**
     * assetGraph.removeRelation(relation)
     * ===================================
     *
     * Remove a relation from the graph. Leaves the relation attached
     * to the source asset.
     *
     * @param {Relation} relation The relation to remove.
     * @return {AssetGraph} The AssetGraph instance (chaining-friendly).
     * @api public
     */
    removeRelation: function (relation) {
        if (!relation || !relation.isRelation) {
            throw new Error('AssetGraph.removeRelation: Not a relation: ' + relation);
        }
        if (!(relation.id in this.idIndex)) {
            throw new Error('AssetGraph.removeRelation: ' + relation + ' not in graph');
        }
        var affectedRelations = [].concat(this._objInBaseAssetPaths[relation.id]);
        affectedRelations.forEach(function (affectedRelation) {
            affectedRelation._unregisterBaseAssetPath();
        }, this);
        relation._unregisterBaseAssetPath();
        delete this.idIndex[relation.id];
        var relationIndex = this._relations.indexOf(relation);
        if (relationIndex === -1) {
            throw new Error('removeRelation: ' + relation + ' not in graph');
        } else {
            this._relations.splice(relationIndex, 1);
        }
        delete this._objInBaseAssetPaths[relation.id];
        affectedRelations.forEach(function (affectedRelation) {
            affectedRelation._registerBaseAssetPath();
        }, this);
        delete relation.assetGraph;
        this.emit('removeRelation', relation);
        return this;
    },

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
    findAssets: function (queryObj) {
        return AssetGraph.query.queryAssetGraph(this, 'asset', queryObj);
    },

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
    findRelations: function (queryObj, includeUnpopulated) {
        var relations = AssetGraph.query.queryAssetGraph(this, 'relation', queryObj);
        if (includeUnpopulated) {
            return relations;
        } else {
            return relations.filter(function (relation) {
                return relation.to.isAsset;
            });
        }
    },

    /**
     * assetGraph.recomputeBaseAssets([fromScratch])
     * =============================================
     *
     * Recompute the base asset paths for all relations for which the base asset
     * path couldn't be computed due to the graph being incomplete at the time
     * they were added.
     *
     * Usually you shouldn't have to worry about this. This method is
     * only exposed for transforms that do certain manipulations
     * causing to graph to temporarily be in a state where the base
     * asset of some relations couldn't be computed, e.g. if
     * intermediate relations are been removed and attached again.
     *
     * Will throw an error if the base asset for any relation couldn't be found.
     *
     * @return {AssetGraph} The AssetGraph instance (chaining-friendly).
     * @api public
     */
    recomputeBaseAssets: function (fromScratch) {
        if (fromScratch) {
            this._objInBaseAssetPaths = {};
            this._relationsWithNoBaseAsset = [];
            this.findAssets().forEach(function (asset) {
                this._objInBaseAssetPaths[asset.id] = [];
            }, this);
            this.findRelations({}, true).forEach(function (relation) {
                this._objInBaseAssetPaths[relation.id] = [];
                delete relation._baseAssetPath;
            }, this);
            this.findRelations({}, true).forEach(function (relation) {
                relation._registerBaseAssetPath();
            }, this);
        } else {
            [].concat(this._relationsWithNoBaseAsset).forEach(function (relation) {
                relation._unregisterBaseAssetPath();
                relation._registerBaseAssetPath();
            }, this);
        }
        return this;
    },

    // Async methods for resolving asset configs and types:

    resolveAssetConfig: function (assetConfig, fromUrl, cb) {
        var that = this;
        if (_.isArray(assetConfig)) {
            // Call ourselves recursively for each item, flatten the results and report back
            if (assetConfig.some(_.isArray)) {
                throw new Error('AssetGraph.resolveAssetConfig: Multidimensional array not supported.');
            }
            return seq(assetConfig)
                .parMap(function (_assetConfig) {
                    var callback = this;
                    that.resolveAssetConfig(_assetConfig, fromUrl, function (err, _resolvedAssetConfigs) {
                        if (err) {
                            that.emit('warn', err);
                            return callback(null, []);
                        } else {
                            callback(null, _resolvedAssetConfigs);
                        }
                    });
                })
                .unflatten()
                .seq(function (resolvedAssetConfigs) {
                    cb(null, _.flatten(resolvedAssetConfigs));
                })['catch'](cb);
        }
        if (typeof assetConfig === 'string') {
            if (/^[\w\+]+:/.test(assetConfig)) {
                // Includes protocol, assume url
                assetConfig = {url: assetConfig};
            } else {
                // File system path
                assetConfig = {url: encodeURI(assetConfig)};
            }
        }
        if (assetConfig.isAsset || assetConfig.isResolved) {
            // Almost done, add .type property if possible (this is all we can do without actually fetching the asset):
            assetConfig.type =
                assetConfig.type ||
                (assetConfig.contentType && AssetGraph.lookupContentType(assetConfig.contentType)) ||
                AssetGraph.typeByExtension[Path.extname(assetConfig.url.replace(/[\?\#].*$/, '')).toLowerCase()];
            return setImmediate(function () {
                cb(null, assetConfig);
            });
        } else if (assetConfig.url) {
            if (/^[a-zA-Z-\+]+:/.test(assetConfig.url)) {
                var protocol = assetConfig.url.substr(0, assetConfig.url.indexOf(':')).toLowerCase(),
                    resolver = that.resolverByProtocol[protocol] || that.defaultResolver;
                if (resolver) {
                    resolver(assetConfig, fromUrl, function (err, resolvedAssetConfig) {
                        if (err) {
                            that.emit('warn', err);
                            cb(null, []);
                        } else {
                            // Keep reresolving until the .isResolved property shows up:
                            that.resolveAssetConfig(resolvedAssetConfig, fromUrl, cb);
                        }
                    });
                } else {
                    return setImmediate(function () {
                        if (!knownAndUnsupportedProtocols[protocol]) {
                            that.emit('warn', new Error(['No resolver found for protocol: ' + protocol, '\tIf you think this protocol should exist, please contribute it here:', '\thttps://github.com/Munter/schemes#contributing'].join('\n')));
                        }
                        cb(null, assetConfig);
                    });
                }
            } else {
                var url = that.resolveUrl(fromUrl, assetConfig.url);

                // If we end up sending back the same url again we'll cause an infinite loop
                if (url !== assetConfig.url) {
                    assetConfig.url = url;
                    that.resolveAssetConfig(assetConfig, fromUrl, cb);
                } else {
                    setImmediate(function () {
                        that.emit('warn', new Error('AssetGraph.resolveAssetConfig: Cannot resolve asset url: ' + util.inspect(assetConfig)));
                        cb(null, []);
                    });
                }
            }
        } else {
            setImmediate(function () {
                that.emit('warn', new Error('AssetGraph.resolveAssetConfig: Cannot resolve asset config (no url): ' + util.inspect(assetConfig)));
                cb(null, []);
            });
        }
    },

    // Resolve a url while taking the root of the AssetGraph instance into account
    resolveUrl: function (fromUrl, url) {
        var that = this;
        if (/^\/(?:[^\/]|$)/.test(url) && /^file:/.test(fromUrl) && /^file:/.test(that.root)) {
            return urlTools.resolveUrl(that.root, url.substr(1));
        } else {
            return urlTools.resolveUrl(fromUrl, url);
        }
    },

    // Tricky business: Might also modify assetConfig.url and assetConfig.rawSrc
    ensureAssetConfigHasType: function (assetConfig, cb) {
        if (assetConfig.isAsset || assetConfig.type) {
            return setImmediate(cb);
        }
        // Looks like there's no way around loading the asset and looking at the src or metadata
        var that = this;
        return assetConfig.rawSrcProxy(function (err, rawSrc, metadata) {
            if (err) {
                that.emit('warn', new Error('AssetGraph.ensureAssetConfigHasType: Couldn\'t load ' + (assetConfig.url || util.inspect(assetConfig)) + ', assuming AssetGraph.Asset'));
                assetConfig.type = 'Asset';
                return cb();
            }
            assetConfig.rawSrc = rawSrc;
            if (metadata) {
                _.extend(assetConfig, metadata);
            }
            function foundType(type) {
                if (!type) {
                    that.emit('warn', new Error('AssetGraph.ensureAssetConfigHasType: Couldn\'t determine asset type from asset config: ' + util.inspect(assetConfig)) + ', assuming AssetGraph.Asset');
                }
                assetConfig.type = type || 'Asset';
                cb();
            }
            if (metadata && metadata.url) {
                var newExtension = Path.extname(assetConfig.url.replace(/[\?\#].*$/, '')).toLowerCase();
                if (newExtension in AssetGraph.typeByExtension) {
                    return foundType(AssetGraph.typeByExtension[newExtension]);
                }
            }
            if (metadata && metadata.contentType) {
                // If the asset was served using HTTP, we shouldn't try to second guess by sniffing.
                foundType(AssetGraph.lookupContentType(metadata.contentType));
            } else if (rawSrc.length === 0) {
                foundType(); // Give up
            } else {
                // Work the magic
                var fileProcess = childProcess.spawn('file', ['-b', '--mime-type', '-']),
                    fileOutput = '';

                fileProcess.on('error', function (err) {
                    that.emit('warn', 'Could not determine asset type from contents using the file command: ' + err.stack);
                });

                // The 'file' utility might close its stdin as soon as it has figured out the content type:
                fileProcess.stdin.on('error', function () {});

                fileProcess.stdout.on('data', function (chunk) {
                    fileOutput += chunk;
                }).on('end', function () {
                    foundType(AssetGraph.lookupContentType(fileOutput.match(/^([^\n]*)/)[1]));
                });
                fileProcess.stdin.end(rawSrc);
            }
        });
    },

    // Traversal:

    eachAssetPreOrder: function (startAssetOrRelation, relationQueryObj, lambda) {
        if (!lambda) {
            lambda = relationQueryObj;
            relationQueryObj = null;
        }
        this._traverse(startAssetOrRelation, relationQueryObj, lambda);
    },

    eachAssetPostOrder: function (startAssetOrRelation, relationQueryObj, lambda) {
        if (!lambda) {
            lambda = relationQueryObj;
            relationQueryObj = null;
        }
        this._traverse(startAssetOrRelation, relationQueryObj, null, lambda);
    },

    _traverse: function (startAssetOrRelation, relationQueryObj, preOrderLambda, postOrderLambda) {
        var that = this,
            relationQueryMatcher = relationQueryObj && AssetGraph.query.createValueMatcher(relationQueryObj),
            startAsset,
            startRelation;
        if (startAssetOrRelation.isRelation) {
            startRelation = startAssetOrRelation;
            startAsset = startRelation.to;
        } else {
            // incomingRelation will be undefined when (pre|post)OrderLambda(startAsset) is called
            startAsset = startAssetOrRelation;
        }

        var seenAssets = {},
            assetStack = [];
        (function traverse(asset, incomingRelation) {
            if (!seenAssets[asset.id]) {
                if (preOrderLambda) {
                    preOrderLambda(asset, incomingRelation);
                }
                seenAssets[asset.id] = true;
                assetStack.push(asset);
                that.findRelations(_.extend({from: asset})).forEach(function (relation) {
                    if (!relationQueryMatcher || relationQueryMatcher(relation)) {
                        traverse(relation.to, relation);
                    }
                });
                var previousAsset = assetStack.pop();
                if (postOrderLambda) {
                    postOrderLambda(previousAsset, incomingRelation);
                }
            }
        }(startAsset, startRelation));
    },

    collectAssetsPreOrder: function (startAssetOrRelation, relationQueryObj) {
        var assetsInOrder = [];
        this.eachAssetPreOrder(startAssetOrRelation, relationQueryObj, function (asset) {
            assetsInOrder.push(asset);
        });
        return assetsInOrder;
    },

    collectAssetsPostOrder: function (startAssetOrRelation, relationQueryObj) {
        var assetsInOrder = [];
        this.eachAssetPostOrder(startAssetOrRelation, relationQueryObj, function (asset) {
            assetsInOrder.push(asset);
        });
        return assetsInOrder;
    },

    // Transforms:
    _runTransform: function (transform, cb) {
        var that = this,
            startTime = new Date(),
            done = passError(cb, function () {
                that.emit('afterTransform', transform, new Date().getTime() - startTime);
                cb(null, that);
            });

        that.emit('beforeTransform', transform);

        if (transform.length < 2) {
            setImmediate(function () {
                try {
                    transform(that);
                } catch (err) {
                    return done(err);
                }
                done();
            });
        } else {
            var callbackCalled = false;
            transform(that, function (err) {
                if (callbackCalled) {
                    console.warn('AssetGraph._runTransform: The transform ' + transform.name + ' called the callback more than once!');
                } else {
                    callbackCalled = true;
                    done(err);
                }
            });
        }
        return that;
    }
});

// Add AssetGraph helper methods that implicitly create a new TransformQueue:
['if', 'queue'].forEach(function (methodName) {
    AssetGraph.prototype[methodName] = function () { // ...
        var transformQueue = new TransformQueue(this);
        return transformQueue[methodName].apply(transformQueue, arguments);
    };
});

AssetGraph.prototype.if_ = AssetGraph.prototype.if;

AssetGraph.transforms = {};

AssetGraph.registerTransform = function (fileNameOrFunction, name) {
    if (typeof fileNameOrFunction === 'function') {
        name = name || fileNameOrFunction.name;
        AssetGraph.transforms[name] = fileNameOrFunction;
    } else {
        // File name
        name = name || Path.basename(fileNameOrFunction, '.js');
        fileNameOrFunction = Path.resolve(process.cwd(), fileNameOrFunction); // Absolutify if not already absolute
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
    if (prototype.contentType) {
        if (prototype.contentType in AssetGraph.typeByContentType) {
            console.warn(type + ': Redefinition of Content-Type ' + prototype.contentType);
            console.trace();
        }
        AssetGraph.typeByContentType[prototype.contentType] = type;
    }
    if (prototype.supportedExtensions) {
        prototype.supportedExtensions.forEach(function (supportedExtension) {
            if (supportedExtension in AssetGraph.typeByExtension) {
                console.warn(type + ': Redefinition of ' + supportedExtension + ' extension');
                console.trace();
            }
            AssetGraph.typeByExtension[supportedExtension] = type;
        });
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

fs.readdirSync(Path.resolve(__dirname, 'transforms')).forEach(function (fileName) {
    AssetGraph.registerTransform(Path.resolve(__dirname, 'transforms', fileName));
});

fs.readdirSync(Path.resolve(__dirname, 'assets')).forEach(function (fileName) {
    if (/\.js$/.test(fileName) && fileName !== 'index.js') {
        AssetGraph.registerAsset(require(Path.resolve(__dirname, 'assets', fileName)));
    }
});

fs.readdirSync(Path.resolve(__dirname, 'relations')).forEach(function (fileName) {
    if (/\.js$/.test(fileName) && fileName !== 'index.js') {
        AssetGraph.registerRelation(Path.resolve(__dirname, 'relations', fileName));
    }
});
