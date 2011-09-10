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

        var bindAndMark = function (fn, scope) {
            var bound = fn.bind(scope);
            bound._belongsToAssetGraph = this; // So we can recognize our listener when unsubscribing to the events in removeAsset
            return bound;
        }.bind(this);

        asset.on('setUrl', bindAndMark(this._updateUrlIndex, this));
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
        ['setUrl'].forEach(function (eventName) {
            var listeners = asset.listeners(eventName);
            for (var i = 0 ; i < listeners.length ; i += 1) {
                if (listeners[i]._belongsToAssetGraph === this) {
                    listeners.splice(i, 1);
                    i -= 1;
                }
            }
        }, this);
        this.findRelations({from: asset}, true).forEach(function (outgoingRelation) {
            this.removeRelation(outgoingRelation);
            if (outgoingRelation.to.isAsset && outgoingRelation.to.isInline) {
                // Remove inline asset
                this.removeAsset(outgoingRelation.to);
            }
        }, this);
        this.findRelations({to: asset}).forEach(function (incomingRelation) {
            if (detachIncomingRelations) {
                this.detachAndRemoveRelation(incomingRelation);
            } else {
                this.removeRelation(incomingRelation);
            }
        }, this);
        var affectedRelations = [].concat(this._objInBaseAssetPaths[asset.id]);
        affectedRelations.forEach(function (affectedRelation) {
            this._unregisterBaseAssetPath(affectedRelation);
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
            this._registerBaseAssetPath(affectedRelation);
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
        relation.assetGraph = this;
        position = position || 'last';
        if (position === 'last') {
            this._relations.push(relation);
        } else if (position === 'first') {
            this._relations.unshift(relation);
        } else { // Assume 'before' or 'after'
            var i = this._relations.indexOf(adjacentRelation) + (position === 'after' ? 1 : 0);
            this._relations.splice(i, 0, relation);
        }
        this._addToIndices(relation, position, adjacentRelation);
        this._objInBaseAssetPaths[relation.id] = [];
        this._registerBaseAssetPath(relation);
        this.emit('addRelation', relation);
    },

    /**
     * assetGraph.attachAndAddRelation(relation, position[, adjacentRelation])
     * =======================================================================
     *
     * Attach a relation to its source asset, then add it to the graph.
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
    attachAndAddRelation: function (relation, position, adjacentRelation) {
        if (!relation || !relation.isRelation) {
            throw new Error("AssetGraph.attachAndAddRelation: Not a relation: ", relation);
        }
        if ((position === 'after' || position === 'before') && (!adjacentRelation || !adjacentRelation.isRelation)) {
            throw new Error("AssetGraph.attachAndAddRelation: Adjacent relation must be provided when position is 'before' or 'after'.");
        }
        relation.attach(relation.from, position, adjacentRelation);
        this.addRelation(relation, position, adjacentRelation);
        this.refreshRelationHref(relation);
        relation.from.markDirty();
    },

    /**
     * assetGraph.removeRelation(relation)
     * ===================================
     *
     * Remove a relation from the graph. Leaves the relation attached
     * to the source asset (compare with the `detachAndRemoveRelation`
     * method).
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
            this._unregisterBaseAssetPath(affectedRelation);
        }, this);
        this._unregisterBaseAssetPath(relation);
        this._removeFromIndices(relation);
        var relationIndex = this._relations.indexOf(relation);
        if (relationIndex === -1) {
            throw new Error("removeRelation: " + relation + " not in graph");
        } else {
            this._relations.splice(relationIndex, 1);
        }
        delete this._objInBaseAssetPaths[relation.id];
        affectedRelations.forEach(function (affectedRelation) {
            this._registerBaseAssetPath(affectedRelation);
        }, this);
        delete relation.assetGraph;
        this.emit('removeRelation', relation);
    },

    /**
     * assetGraph.detachAndRemoveRelation(relation)
     * ============================================
     *
     * Detach a relation from its source asset, then remove it from the graph.
     *
     * @param {Relation} relation The relation to detach and remove.
     * @api public
     */
    detachAndRemoveRelation: function (relation) {
        if (!relation || !relation.isRelation) {
            throw new Error("AssetGraph.detachAndRemoveRelation: Not a relation: ", relation);
        }
        relation.detach(relation);
        relation.from.markDirty();
        this.removeRelation(relation);
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
     * assetGraph.inlineRelation(relation)
     * ===================================
     *
     * Inline a relation. This is only supported by certain relation
     * types and will produce different results depending on the type
     * (`data:` url, inline script, inline stylesheet...).
     *
     * Will make a clone of the target asset if it has more incoming
     * relations than the one being inlined.
     *
     * @param {Relation} relation The relation to inline.
     * @api public
     */
    inlineRelation: function (relation) {
        if (!relation || !relation.isRelation) {
            throw new Error("AssetGraph.inlineRelation: Not a relation: ", relation);
        }
        if (this.findRelations({to: relation.to}).length !== 1) {
            // This isn't the only incoming relation, clone the asset before inlining it.
            this.cloneAsset(relation.to, [relation]);
        }
        if (!relation.to.isInline) {
            var affectedRelations = [].concat(this._objInBaseAssetPaths[relation.to.id]);
            affectedRelations.forEach(function (affectedRelation) {
                this._unregisterBaseAssetPath(affectedRelation);
            }, this);

            relation.to.url = null;
            affectedRelations.forEach(function (affectedRelation) {
                this._registerBaseAssetPath(affectedRelation);
                this.refreshRelationHref(affectedRelation);
            }, this);
        }
        relation._inline();
    },

    /**
     * assetGraph.refreshRelationHref(relation)
     * ========================================
     *
     * Update `href` of a relation to make sure it points at the
     * current url of its target asset.
     *
     * It's not necessary to call this function manually as long as
     * the source and target assets of the relation have only been
     * moved by having their `url` property changed (the recommended
     * way), but some transforms will need this after some low-level
     * surgery, such as attaching an existing relation to a different
     * asset.
     *
     * @param {Relation} relation The relation that should have its `href` refreshed.
     * @api public
     */
    refreshRelationHref: function (relation) {
        if (!relation || !relation.isRelation || !relation.to) {
            throw new Error('AssetGraph.refreshRelationHref: Not a relation: ', relation);
        }
        // if (relation.to.isInline) won't work because relation.to might be unresolved and thus not an assets.Asset instance:
        if (relation.to.url) {
            var relativeUrl = urlTools.buildRelativeUrl(this.getBaseAssetForRelation(relation).url, relation.to.url);
            if (relation.href !== relativeUrl) {
                relation.href = relativeUrl;
                relation.from.markDirty();
            }
        }
    },

    /**
     * assetGraph.updateRelationTarget(relation, newTargetAsset)
     * =========================================================
     *
     * Point a relation at a different asset. Saves you from having to
     * remove the relation, update its `to` property, then add it
     * again at the right position.
     *
     * @param {Relation} relation The relation to update.
     * @param {Asset} newTargetAsset The new target asset.
     * @api public
     */
    updateRelationTarget: function (relation, newTargetAsset) {
        if (!relation || !relation.isRelation) {
            throw new Error("AssetGraph.updateRelationTarget: Not a relation: ", relation);
        }
        if (!newTargetAsset || !newTargetAsset.isAsset) {
            throw new Error("AssetGraph.updateRelationTarget: Target is not an asset: ", newTargetAsset);
        }
        var oldGlobalPosition = this._relations.indexOf(relation),
            oldTypeIndexPosition = this._indices.relation.type[relation.type].indexOf(relation),
            oldFromIndexPosition = this._indices.relation.from[relation.from.id].indexOf(relation);
        this.removeRelation(relation);
        relation.to = newTargetAsset;
        this.addRelation(relation);
        this._indices.relation.from[relation.from.id].splice(this._indices.relation.from[relation.from.id].indexOf(relation), 1);
        this._indices.relation.from[relation.from.id].splice(oldFromIndexPosition, 0, relation);
        this._indices.relation.type[relation.type].splice(this._indices.relation.type[relation.type].indexOf(relation), 1);
        this._indices.relation.type[relation.type].splice(oldTypeIndexPosition, 0, relation);
        this._relations.splice(this._relations.indexOf(relation), 1);
        this._relations.splice(oldGlobalPosition, 0, relation);
        this.refreshRelationHref(relation);
    },

    /**
     * assetGraph.replaceAsset(oldAsset, newAsset)
     * ===========================================
     *
     * Replace an asset in the graph with another asset, then remove
     * the old asset from the graph.
     *
     * Updates the incoming relations of the old asset to point at the
     * new one and preserves the url of the old asset if it's not
     * inline.
     *
     * @param {Asset} oldAsset The asset to replace.
     * @param {Asset} newAsset The asset to put in its place.
     * @api public
     */
    replaceAsset: function (oldAsset, newAsset) {
        if (!oldAsset || !oldAsset.isAsset) {
            throw new Error("AssetGraph.replaceAsset: oldAsset is not an asset: ", oldAsset);
        }
        if (!newAsset || !newAsset.isAsset) {
            throw new Error("AssetGraph.replaceAsset: newAsset is not an asset: ", newAsset);
        }
        if (!(oldAsset.id in this.idIndex)) {
            throw new Error("AssetGraph.replaceAsset: Old asset isn't in the graph: " + oldAsset);
        }
        if (newAsset.id in this.idIndex) {
            throw new Error("AssetGraph.replaceAsset: New asset is already in the graph: " + newAsset);
        }
        this.addAsset(newAsset);
        this.findRelations({to: oldAsset}).forEach(function (incomingRelation) {
            this.updateRelationTarget(incomingRelation, newAsset);
        }, this);
        this.removeAsset(oldAsset);
        if (oldAsset.url) {
            newAsset.url = oldAsset.url;
        }
    },

    /**
     * assetGraph.cloneAsset(asset[, incomingRelations])
     * =================================================
     *
     * Clone an asset and add the clone to the graph. As an extra
     * service, optionally update some caller-specified relations to
     * point at the clone.
     *
     * Makes up an url for the clone if the original asset wasn't
     * inline.
     *
     * @param {Asset} asset The asset to clone.
     * @param {Array} incomingRelations (optional) Some incoming relations that should be pointed at the clone.
     * @return {Asset} The cloned asset.
     * @api public
     */
    cloneAsset: function (asset, incomingRelations) {
        if (!asset || !asset.isAsset) {
            throw new Error("AssetGraph.cloneAsset: Not an asset: ", asset);
        }
        var clone = asset._clone();
        if (!asset.isInline) {
            clone.url = urlTools.resolveUrl(asset.url, clone.id + asset.extension);
        }
        if (asset.isInitial) {
            clone.isInitial = true;
        }
        this.addAsset(clone);

        if (incomingRelations) {
            incomingRelations.forEach(function (incomingRelation) {
                if (!incomingRelation || !incomingRelation.isRelation) {
                    throw new Error("AssetGraph.cloneAsset: Incoming relation is not a relation: ", incomingRelation);
                }
                if (incomingRelation.id in this.idIndex) {
                    this.updateRelationTarget(incomingRelation, clone);
                } else {
                    incomingRelation.to = clone;
                    this.addRelation(incomingRelation);
                }
            }, this);
        }
        this.populateRelationsToExistingAssets(clone);
        return clone;
    },

    /**
     * assetGraph.populateRelationsToExistingAssets(asset)
     * ===================================================
     *
     * Go through the unresolved outgoing relations of an asset and
     * add the ones that refer to assets that are already part of
     * the graph. Recurses into inline assets.
     *
     * You shouldn't need to worry about this. It's mostly useful as a
     * helper for the `cloneAsset` method, but also used by the
     * `compressJavaScript` transform.
     *
     * @param {Asset} asset The asset.
     * @api public
     */
    populateRelationsToExistingAssets: function (asset) {
        if (!asset || !asset.isAsset) {
            throw new Error("AssetGraph.populateRelationsToExistingAssets: Not an asset: ", asset);
        }
        asset.outgoingRelations.forEach(function (outgoingRelation) {
            var relativeUrl;
            if (outgoingRelation.to.url || typeof outgoingRelation.to === 'string') {
                var targetUrl = urlTools.resolveUrl(this.getBaseAssetForRelation(outgoingRelation).url, outgoingRelation.to.url || outgoingRelation.to);
                if (targetUrl in this.urlIndex) {
                    outgoingRelation.to = this.urlIndex[targetUrl];
                    this.addRelation(outgoingRelation);
                }
            } else {
                // Inline asset
                outgoingRelation.to = AssetGraph.assets.create(outgoingRelation.to);
                this.addAsset(outgoingRelation.to);
                this.addRelation(outgoingRelation);
                this.populateRelationsToExistingAssets(outgoingRelation.to);
            }
        }, this);
    },

    /**
     * assetGraph.getBaseAssetForRelation(relation)
     * ============================================
     *
     * Find the asset from which the url of a given relation is to be
     * resolved. This is usually the first non-inline containing
     * asset, but for some relation types it's the first Html ancestor
     * -- infamously `CssAlphaImageLoader` and `CssBehavior`, but also
     * `JavaScriptOneGetStaticUrl`.
     *
     * The relation doesn't have to be in the graph, so this can be used
     * during population of the graph.
     *
     * @param {Relation} relation The relation to find the base asset path for.
     * @return {Asset} The base asset for the relation.
     * @api public
     */
    getBaseAssetForRelation: function (relation) {
        if (!relation || !relation.isRelation) {
            throw new Error("AssetGraph.getBaseAssetForRelation: Not a relation: ", relation);
        }
        if (!(relation.from.id in this.idIndex)) {
            throw new Error("AssetGraph.getBaseAssetForRelation: The 'from' asset of the relation is not in the graph: ", relation.from);
        }
        // Will return undefined if no path is found
        if (relation.id in this.idIndex) {
            return this._baseAssetPathForRelation[relation.id][0];
        } else {
            // The relation isn't in the graph (yet), we'll have to do the computation:
            return this._findBaseAssetPathForRelation(relation)[0];
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
            this._unregisterBaseAssetPath(relation);
            if (!this._registerBaseAssetPath(relation)) {
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
     * assetGraph._findBaseAssetForRelation(relation)
     * ==============================================
     *
     * Helper function for the getBaseAssetForRelation method.
     *
     * @param {Relation} relation The relation for which to find the base asset path. Must be in the graph.
     * @return {Array} The complete path to the base asset: [baseAsset, intermediateRelation, asset, ...]. For normal non-inline assets that will just be [baseAsset].
     * @api private
     */
    _findBaseAssetPathForRelation: function (relation) {
        if (!relation || !relation.isRelation) {
            throw new Error("AssetGraph._findBaseAssetPathForRelation: Not a relation: ", relation);
        }
        if (!(relation.from.id in this.idIndex)) {
            throw new Error("AssetGraph._findBaseAssetPathForRelation: The 'from' asset of the relation is not in the graph: ", relation.from);
        }
        var baseAssetMatcher = AssetGraph.query.queryObjToMatcherFunction(relation.baseAssetQuery),
            queue = [[relation.from]],
            seenAssets = {};
        // Reverse breadth-first search
        while (queue.length) {
            var assetPath = queue.shift();
            if (baseAssetMatcher(assetPath[0])) {
                return assetPath;
            }
            seenAssets[assetPath[0].id] = true;

            // Add all yet-unseen assets reachable via incoming relations to the end of the queue:
            this.findRelations({to: assetPath[0]}).forEach(function (incomingRelation) {
                if (!(incomingRelation.from.id in seenAssets)) {
                    queue.push([incomingRelation.from, incomingRelation].concat(assetPath));
                }
            });
        }
        return []; // No base asset found
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
                this._unregisterBaseAssetPath(affectedRelation);
                this._registerBaseAssetPath(affectedRelation);
            }
            if (this.getBaseAssetForRelation(affectedRelation) === asset) {
                this.refreshRelationHref(affectedRelation);
            }
        }, this);
        this.findRelations({to: asset}).forEach(function (incomingRelation) {
            this.refreshRelationHref(incomingRelation);
        }, this);
    },

    /**
     * assetGraph._registerBaseAssetPath(relation)
     * ===========================================
     *
     * Register the base asset path of a relation (save it in the
     * internal index).
     *
     * @param {Relation} relation The relation.
     * @return {Boolean} Whether the base asset path could be
     * computed.
     * @api private
     */
    _registerBaseAssetPath: function (relation) {
        if (!relation || !relation.isRelation) {
            throw new Error("AssetGraph._registerBaseAssetPath: Not a relation: ", relation);
        }
        var baseAssetPath = this._findBaseAssetPathForRelation(relation);
        this._baseAssetPathForRelation[relation.id] = baseAssetPath;
        if (baseAssetPath.length === 0) {
            this._relationsWithNoBaseAsset.push(relation);
            return false;
        } else {
            baseAssetPath.forEach(function (obj) {
                this._objInBaseAssetPaths[obj.id].push(relation);
            }, this);
            return true;
        }
    },

    /**
     * assetGraph._unregisterBaseAssetPath(relation)
     * =============================================
     *
     * Remove the the base asset path of a relation from the internal
     * indices.
     *
     * @param {Relation} relation The relation.
     * @api private
     */
    _unregisterBaseAssetPath: function (relation) {
        if (!relation || !relation.isRelation) {
            throw new Error("AssetGraph._unregisterBaseAssetPath: Not a relation: ", relation);
        }
        var baseAssetPath = this._baseAssetPathForRelation[relation.id];
        if (baseAssetPath) { // FIXME: Should always be there!
            if (baseAssetPath.length === 0) {
                this._relationsWithNoBaseAsset.splice(this._relationsWithNoBaseAsset.indexOf(relation), 1);
            } else {
                baseAssetPath.forEach(function (obj) {
                    if (this._objInBaseAssetPaths[obj.id]) { // FIXME: Should always be there!
                        this._objInBaseAssetPaths[obj.id].splice(this._objInBaseAssetPaths[obj.id].indexOf(relation), 1);
                    }
                }, this);
            }
            delete this._baseAssetPathForRelation[relation.id];
        }
    }
});

_.extend(AssetGraph.prototype, require('./AssetGraph-transform'));
_.extend(AssetGraph.prototype, require('./AssetGraph-traversal'));

module.exports = AssetGraph;
