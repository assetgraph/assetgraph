/**
 * @class AssetGraph
 * @extends EventEmitter
 */
var util = require('util'),
    events = require('events'),
    Path = require('path'),
    _ = require('underscore'),
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
    if (!('root' in this)) {
        this.root = urlTools.fsDirToFileUrl(process.cwd());
    } else if (!/^[a-z0-9]+:/.test(this.root)) { // No protocol, assume local file system path
        this.root = urlTools.fsDirToFileUrl(this.root);
    } else {
        this.root = urlTools.ensureTrailingSlash(this.root);
    }
    this._assets = [];
    this._relations = [];
    this._baseAssetPathForRelation = {};
    this._objInBaseAssetPaths = {};
    this._relationsWithNoBaseAsset = [];
    this._indices = {};
    this.urlIndex = {};
    this.idIndex = {};
    this.resolverByProtocol = {
        data: AssetGraph.resolvers.data(),
        file: AssetGraph.resolvers.file(),
        http: AssetGraph.resolvers.http(),
        https: AssetGraph.resolvers.http()
    };
    _.each(AssetGraph.query.indices, function (indexNames, indexType) {
        this._indices[indexType] = {};
        indexNames.forEach(function (indexName) {
            this._indices[indexType][indexName] = {};
        }, this);
    }, this);
};

util.inherits(AssetGraph, events.EventEmitter);

AssetGraph.assets = require('./assets');
AssetGraph.relations = require('./relations');
AssetGraph.transforms = require('./transforms');
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
     * assetGraph.addAsset(asset)
     * ==========================
     *
     * Add an asset to the graph.
     *
     * @param {Asset} asset The asset to add.
     * @api public
     */
    addAsset: function (asset) {
        if (!asset || !asset.id || !asset.isAsset) {
            throw new Error("AssetGraph.addAsset: " + asset + " is not an asset");
        }
        if (asset.id in this.idIndex) {
            throw new Error("AssetGraph.addAsset: " + asset + " already in graph");
        }
        if (asset.url && asset.url in this.urlIndex) {
            throw new Error("AssetGraph.addAsset: " + asset.url + " already loaded");
        }
        this._assets.push(asset);
        this._addToIndices(asset);
        this._objInBaseAssetPaths[asset.id] = [];
        asset.assetGraph = this;

        this.emit('addAsset', asset);
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
     */
    removeAsset: function (asset, detachIncomingRelations) {
        if (!(asset.id in this.idIndex)) {
            throw new Error("AssetGraph.removeAsset: " + asset + " not in graph");
        }
        this.findRelations({from: asset}, true).forEach(function (outgoingRelation) {
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
        this._removeFromIndices(asset);
        affectedRelations.forEach(function (affectedRelation) {
            affectedRelation._registerBaseAssetPath();
        }, this);
        delete asset.assetGraph;
        this.emit('removeAsset', asset);
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
     * @api private
     */
    addRelation: function (relation, position, adjacentRelation) { // position and adjacentRelation are optional
        if (!relation || !relation.id || !relation.isRelation) {
            throw new Error("AssetGraph.addRelation: Not a relation: ", relation);
        }
        if (relation.id in this.idIndex) {
            throw new Error("AssetGraph.addRelation: Relation already in graph: ", relation);
        }
        if (!relation.from || !relation.from.isAsset) {
            throw new Error("AssetGraph.addRelation: 'from' property of relation is not an asset: ", relation.from);
        }
        if (!(relation.from.id in this.idIndex)) {
            throw new Error("AssetGraph.addRelation: 'from' property of relation is not in the graph: ", relation.from);
        }
        if (!relation.to || (!relation.to.isAsset && !relation.to.isResolved)) {
            throw new Error("AssetGraph.addRelation: 'to' property of relation is not an asset or a resolved asset config: ", relation.to);
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
        this._addToIndices(relation, position, adjacentRelation);
        this._objInBaseAssetPaths[relation.id] = [];
        relation._registerBaseAssetPath();
        this.emit('addRelation', relation);
    },

    /**
     * assetGraph.removeRelation(relation)
     * ===================================
     *
     * Remove a relation from the graph. Leaves the relation attached
     * to the source asset.
     *
     * @param {Relation} relation The relation to remove.
     * @api public
     */
    removeRelation: function (relation) {
        if (!relation || !relation.isRelation) {
            throw new Error("AssetGraph.removeRelation: Not a relation: ", relation);
        }
        if (!(relation.id in this.idIndex)) {
            throw new Error("AssetGraph.removeRelation: " + relation + " not in graph");
        }
        var affectedRelations = [].concat(this._objInBaseAssetPaths[relation.id]);
        affectedRelations.forEach(function (affectedRelation) {
            affectedRelation._unregisterBaseAssetPath();
        }, this);
        relation._unregisterBaseAssetPath();
        this._removeFromIndices(relation);
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
     * assetGraph.recomputeBaseAssets()
     * ================================
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
     * @api public
     */
    recomputeBaseAssets: function () {
        [].concat(this._relationsWithNoBaseAsset).forEach(function (relation) {
            relation._unregisterBaseAssetPath();
            if (!relation._registerBaseAssetPath()) {
                throw new Error("recomputeBaseAssets: Couldn't find base asset for " + relation);
            }
        }, this);
    },

    /**
     * assetGraph._addToIndices(obj, position[, adjacentObj])
     * ======================================================
     *
     * Add an asset or relation to the indices of the AssetGraph instance.
     *
     * The ordering of certain relation types is significant (`HtmlScript`, for instance), so it's important
     * that the order isn't scrambled in the indices. Therefore the caller must explicitly specify a position
     * at which to insert the object.
     *
     * @param {Asset|Relation} obj The asset or relation to add to the indices.
     * @param {String} position "first", "last", "before", or "after".
     * @param {Asset|Relation} adjacentObj The adjacent object, mandatory if position is "before" or "after".
     * @api private
     */
    _addToIndices: function (obj, position, adjacentObj) { // position and adjacentRelation are optional
        var objType;
        if (obj.isAsset) {
            objType = 'asset';
        } else if (obj.isRelation) {
            objType = 'relation';
        } else {
            throw new Error("AssetGraph._addToIndices: The object is neither an asset nor a relation: ", obj);
        }
        if (obj.id in this.idIndex) {
            throw new Error("AssetGraph._addToIndices: The " + objType + " is already in the id index: ", obj);
        }
        if (obj.isAsset && obj.url) {
            if (obj.url in this.urlIndex) {
                throw new Error("AssetGraph._addToIndices: Url is already in url index: ", obj.url);
            }
            this.urlIndex[obj.url] = obj;
        }
        this.idIndex[obj.id] = obj;
        AssetGraph.query.indices[objType].forEach(function (indexName) {
            position = position || 'last';
            if (indexName in obj) {
                var type = typeof obj[indexName],
                    key;
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    key = obj[indexName];
                } else if (type === 'object' && 'id' in obj[indexName]) {
                    key = obj[indexName].id;
                }
                if (typeof key !== 'undefined') {
                    var index = this._indices[objType][indexName];
                    if (!(key in index)) {
                        index[key] = [obj];
                    } else {
                        if (position === 'last') {
                            index[key].push(obj);
                        } else if (position === 'first') {
                            index[key].unshift(obj);
                        } else { // 'before' or 'after'
                            var i = index[key].indexOf(adjacentObj) + (position === 'after' ? 1 : 0);
                            index[key].splice(i, 0, obj);
                        }
                    }
                }
            }
        }, this);
    },

    /**
     * assetGraph._removeFromIndices(obj)
     * ==================================
     *
     * Remove an asset or relation from the indices of the AssetGraph instance.
     *
     * @param {Asset|Relation} obj The asset or relation to remove from the indices.
     * @api private
     */
    _removeFromIndices: function (obj) {
        var objType;
        if (obj.isAsset) {
            objType = 'asset';
        } else if (obj.isRelation) {
            objType = 'relation';
        } else {
            throw new Error("AssetGraph._addToIndices: The object is neither an asset nor a relation: ", obj);
        }
        if (!(obj.id in this.idIndex)) {
            throw new Error("AssetGraph._removeFromIndices: The " + objType + " isn't in the id index: ", obj);
        }
        if (obj.isAsset && obj.url) {
            if (!(obj.url in this.urlIndex)) {
                throw new Error("AssetGraph._removeFromIndices: Asset isn't in the url index: ", obj);
            }
            delete this.urlIndex[obj.url];
        }
        delete this.idIndex[obj.id];
        AssetGraph.query.indices[objType].forEach(function (indexName) {
            if (indexName in obj) {
                var type = typeof obj[indexName],
                    key;
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    key = obj[indexName];
                } else if (type === 'object' && 'id' in obj[indexName]) {
                    key = obj[indexName].id;
                }
                if (typeof key !== 'undefined') {
                    var index = this._indices[objType][indexName],
                        i = index[key].indexOf(obj);
                    if (i === -1) {
                        throw "_removeFromIndices: object not found in index!";
                    } else {
                        index[key].splice(i, 1);
                    }
                }
            }
        }, this);
    },

    /**
     * assetGraph._lookupIndex(indexType, indexName, value)
     * ====================================================
     *
     * Look up a value in a relation or asset index.
     *
     * @param indexType The index type, either "asset" or "relation"
     * @param indexName The index name, supported values: "type", "from" (relations only), "to" (relations only), "isInitial" (assets only).
     * @api private
     */
    _lookupIndex: function (indexType, indexName, value) {
        return this._indices[indexType][indexName][typeof value === 'object' ? value.id : value] || [];
    },

    /**
     * assetGraph._updateUrlIndex(asset, newUrl, oldUrl)
     * =================================================
     *
     * Update the graph's url index for an asset.
     *
     * @param {Asset} asset The asset that had its url changed.
     * @param {String} newUrl (optional) The new url of the asset. A falsy value means that the asset is now inline.
     * @param {String} oldUrl (optional) The old (previous) url of the asset. A falsy value means that the asset was previously inline.
     * @api private
     */
    _updateUrlIndex: function (asset, newUrl, oldUrl) {
        if (!asset || !asset.isAsset) {
            throw new Error("AssetGraph._updateUrlIndex: Not an asset: ", asset);
        }
        if (oldUrl && !(oldUrl in this.urlIndex)) {
            throw new Error("AssetGraph._updateUrlIndex: oldUrl is not in the url index: " + oldUrl);
        }
        if (newUrl && (newUrl in this.urlIndex)) {
            throw new Error("AssetGraph._updateUrlIndex: newUrl is already in the url index: " + newUrl);
        }
        if (this._relationsWithNoBaseAsset.length) {
            this.recomputeBaseAssets();
        }
        if (oldUrl) {
            delete this.urlIndex[oldUrl];
        }
        if (newUrl) {
            this.urlIndex[newUrl] = asset;
        }
        [].concat(this._objInBaseAssetPaths[asset.id]).forEach(function (affectedRelation) {
            if (!oldUrl) {
                // Un-inlining the asset, need to recompute all base asset paths it's a member of:
                affectedRelation._unregisterBaseAssetPath();
                affectedRelation._registerBaseAssetPath();
            }
            if (affectedRelation.baseAsset === asset) {
                affectedRelation.refreshHref();
            }
        }, this);
        this.findRelations({to: asset}).forEach(function (incomingRelation) {
            incomingRelation.refreshHref();
        }, this);
    }
});

_.extend(AssetGraph.prototype, require('./AssetGraph-transform'));
_.extend(AssetGraph.prototype, require('./AssetGraph-traversal'));

module.exports = AssetGraph;
