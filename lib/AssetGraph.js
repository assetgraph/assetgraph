/**
 * @class AssetGraph
 * @extends EventEmitter
 */
var util = require('util'),
    events = require('events'),
    Path = require('path'),
    _ = require('underscore'),
    passError = require('./util/passError'),
    urlTools = require('./util/urlTools');

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
    events.EventEmitter.call(this);
    _.extend(this, options);
    if (!this.root) {
        this.root = urlTools.fsDirToFileUrl(process.cwd());
    } else if (!/^[a-z0-9\+]+:/.test(this.root)) { // No protocol, assume local file system path
        this.root = urlTools.fsDirToFileUrl(this.root);
    } else {
        this.root = urlTools.ensureTrailingSlash(this.root);
    }
    this._assets = [];
    this._relations = [];
    this._objInBaseAssetPaths = {};
    this._relationsWithNoBaseAsset = [];
    this._indices = {};
    this.idIndex = {};
    this.resolverByProtocol = {
        data: AssetGraph.resolvers.data(),
        file: AssetGraph.resolvers.file(),
        http: AssetGraph.resolvers.http(),
        https: AssetGraph.resolvers.http()
    };
    this._transformContexts = [{transforms: [], callbacks: []}];
};

util.inherits(AssetGraph, events.EventEmitter);

AssetGraph.assets = require('./assets');
AssetGraph.relations = require('./relations');
AssetGraph.query = require('./query');
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
        if (!asset || !asset.id || !asset.isAsset) {
            throw new Error("AssetGraph.addAsset: " + asset + " is not an asset");
        }
        if (asset.id in this.idIndex) {
            throw new Error("AssetGraph.addAsset: " + asset + " is already in graph (id already in idIndex)");
        }
        this.idIndex[asset.id] = asset;
        this._assets.push(asset);
        this._objInBaseAssetPaths[asset.id] = [];
        asset.assetGraph = this;
        asset.isPopulated = false;
        this.emit('addAsset', asset);
        if (asset.isLoaded) {
            asset.populate();
        }
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
            throw new Error("AssetGraph.removeAsset: " + asset + " not in graph");
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
            throw new Error("removeAsset: " + asset + " not in graph");
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
            throw new Error("AssetGraph.addRelation: Not a relation: " + relation);
        }
        if (relation.id in this.idIndex) {
            throw new Error("AssetGraph.addRelation: Relation already in graph: " + relation);
        }
        if (!relation.from || !relation.from.isAsset) {
            throw new Error("AssetGraph.addRelation: 'from' property of relation is not an asset: " + relation.from);
        }
        if (!(relation.from.id in this.idIndex)) {
            throw new Error("AssetGraph.addRelation: 'from' property of relation is not in the graph: " + relation.from);
        }
        if (!relation.to) {
            throw new Error("AssetGraph.addRelation: 'to' property of relation is missing");
        }
        position = position || 'last';
        relation.assetGraph = this;
        if (position === 'last') {
            this._relations.push(relation);
        } else if (position === 'first') {
            this._relations.unshift(relation);
        } else if (position === 'before' || position === 'after') { // Assume 'before' or 'after'
            if (!adjacentRelation || !adjacentRelation.isRelation) {
                throw new Error("AssetGraph.addRelation: Adjacent relation is not a relation: " + adjacentRelation);
            }
            var i = this._relations.indexOf(adjacentRelation) + (position === 'after' ? 1 : 0);
            if (i === -1) {
                throw new Error("AssetGraph.addRelation: Adjacent relation is not in the graph: " + adjacentRelation);
            }
            this._relations.splice(i, 0, relation);
        } else {
            throw new Error("AssetGraph.addRelation: Illegal 'position' argument: " + position);
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
            throw new Error("AssetGraph.removeRelation: Not a relation: " + relation);
        }
        if (!(relation.id in this.idIndex)) {
            throw new Error("AssetGraph.removeRelation: " + relation + " not in graph");
        }
        var affectedRelations = [].concat(this._objInBaseAssetPaths[relation.id]);
        affectedRelations.forEach(function (affectedRelation) {
            affectedRelation._unregisterBaseAssetPath();
        }, this);
        relation._unregisterBaseAssetPath();
        delete this.idIndex[relation.id];
        var relationIndex = this._relations.indexOf(relation);
        if (relationIndex === -1) {
            throw new Error("removeRelation: " + relation + " not in graph");
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
                if (!relation._registerBaseAssetPath()) {
                    throw new Error("recomputeBaseAssets: Couldn't find base asset for " + relation);
                }
            }, this);
        }
        return this;
    },

    // Traversal:

    eachAssetPostOrder: function (startAssetOrRelation, relationQueryObj, lambda) {
        var that = this;
        if (!lambda) {
            lambda = relationQueryObj;
            relationQueryObj = null;
        }
        var relationQueryMatcher = relationQueryObj && AssetGraph.query.createValueMatcher(relationQueryObj),
            startAsset,
            startRelation;
        if (startAssetOrRelation.isRelation) {
            startRelation = startAssetOrRelation;
            startAsset = startRelation.to;
        } else {
            // incomingRelation will be undefined when lambda(startAsset) is called
            startAsset = startAssetOrRelation;
        }

        var seenAssets = {},
            stack = [];
        (function traverse(asset, incomingRelation) {
            if (!seenAssets[asset.id]) {
                seenAssets[asset.id] = true;
                stack.push(asset);
                that.findRelations(_.extend({from: asset})).forEach(function (relation) {
                    if (!relationQueryMatcher || relationQueryMatcher(relation)) {
                        traverse(relation.to, relation);
                    }
                });
                lambda(stack.pop(), incomingRelation);
            }
        }(startAsset, startRelation));
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
            process.nextTick(function () {
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
                    console.warn("AssetGraph._runTransform: The transform " + transform.name + " called the callback more than once!");
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

function TransformQueue(assetGraph) {
    this.assetGraph = assetGraph;
    this.transforms = [];
    this.conditions = [];
}

TransformQueue.prototype = {
    queue: function () { // ...
        if (!this.conditions.length || this.conditions[this.conditions.length - 1]) {
            Array.prototype.push.apply(this.transforms, arguments);
        }
        return this;
    },

    if: function (condition) {
        this.conditions.push(condition);
        return this;
    },

    endif: function () {
        this.conditions.pop();
        return this;
    },

    run: function (cb) {
        var that = this,
            nextTransform;
        // Skip past falsy transforms:
        do {
            nextTransform = that.transforms.shift();
        } while (!nextTransform && that.transforms.length);
        if (nextTransform) {
            that.assetGraph._runTransform(nextTransform, function (err) {
                if (err) {
                    if (cb) {
                        cb(err);
                    } else {
                        that.assetGraph.emit('error', err);
                    }
                } else {
                    that.run(cb);
                }
            });
        } else if (cb) {
            cb(null, that.assetGraph);
        }
    }
};

// Pre-ES5 alternative for the 'if' method:
TransformQueue.prototype.if_ = TransformQueue.prototype.if;
AssetGraph.prototype.if_ = AssetGraph.prototype.if;

AssetGraph.transforms = {};

AssetGraph.registerTransform = function (functionOrFileName, name) {
    if (typeof functionOrFileName === 'function') {
        name = name || functionOrFileName.name;
        AssetGraph.transforms[name] = functionOrFileName;
    } else {
        // File name
        name = name || Path.basename(functionOrFileName, '.js');
        functionOrFileName = Path.resolve(process.cwd(), functionOrFileName); // Absolutify if not already absolute
        AssetGraph.transforms.__defineGetter__(name, function () {
            return require(functionOrFileName);
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

// Register ./transforms/*:

require('fs').readdirSync(Path.resolve(__dirname, 'transforms')).forEach(function (fileName) {
    AssetGraph.registerTransform(Path.resolve(__dirname, 'transforms', fileName));
});

module.exports = AssetGraph;
