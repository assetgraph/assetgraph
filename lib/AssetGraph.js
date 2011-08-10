var util = require('util'),
    events = require('events'),
    Path = require('path'),
    _ = require('underscore'),
    seq = require('seq'),
    urlTools = require('./util/urlTools'),
    passError = require('./util/passError');

function AssetGraph(config) {
    if (!(this instanceof AssetGraph)) {
        return new AssetGraph(config);
    }
    events.EventEmitter.call(this);
    _.extend(this, config);
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
    multiplyRelationBasedOnResolvedAssetConfigs: function (originalRelation, resolvedAssetConfigs) {
        if (!_.isArray(resolvedAssetConfigs)) {
            // Simple case
            resolvedAssetConfigs = [resolvedAssetConfigs];
        }
        if (resolvedAssetConfigs.length === 0) {
            originalRelation.from.detachRelation(originalRelation);
            originalRelation.from.markDirty();
            return [];
        } else if (resolvedAssetConfigs.length === 1) {
            originalRelation.to = resolvedAssetConfigs[0];
            return [originalRelation];
        } else if (originalRelation.from.attachRelation) {
            var multipliedRelations = [];
            resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                var relation = new originalRelation.constructor({
                    from: originalRelation.from,
                    to: resolvedAssetConfig
                });
                relation.from.attachRelation(relation, 'before', originalRelation);
                this.refreshRelationUrl(relation);
                multipliedRelations.push(relation);
            }, this);
            originalRelation.from.detachRelation(originalRelation);
            originalRelation.from.markDirty();
            return multipliedRelations;
        } else {
            throw new Error("assetConfig resolved to multiple, but " + originalRelation.type + " doesn't support attachRelation");
        }
    },

    _addToIndices: function (indexType, obj, position, adjacentObj) { // position and adjacentRelation are optional
        this.idIndex[obj.id] = obj;
        if (indexType === 'asset' && obj.url) {
            this.urlIndex[obj.url] = obj;
        }
        AssetGraph.query.indices[indexType].forEach(function (indexName) {
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
                    var index = this._indices[indexType][indexName];
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

    _removeFromIndices: function (indexType, obj) {
        if (indexType === 'asset' && obj.url) {
            delete this.urlIndex[obj.url];
        }
        delete this.idIndex[obj.id];
        AssetGraph.query.indices[indexType].forEach(function (indexName) {
            if (indexName in obj) {
                var type = typeof obj[indexName],
                    key;
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    key = obj[indexName];
                } else if (type === 'object' && 'id' in obj[indexName]) {
                    key = obj[indexName].id;
                }
                if (typeof key !== 'undefined') {
                    var index = this._indices[indexType][indexName],
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

    _lookupIndex: function (indexType, indexName, value) {
        return this._indices[indexType][indexName][typeof value === 'object' ? value.id : value] || [];
    },

    findAssets: function (queryObj) {
        return AssetGraph.query.queryAssetGraph(this, 'asset', queryObj);
    },

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

    // "root/relative/path.html"
    // "file:///home/foo/thething.jpg"
    // "http://example.com/hereiam.css"
    // {rawSrc: "thesource", type: "Css"}
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
        this._addToIndices('asset', asset);
        this._objInBaseAssetPaths[asset.id] = [];

        function bindAndMark(fn, scope) {
            var bound = fn.bind(scope);
            bound.owner = this; // So we can recognize our listener when unsubscribing to the events in removeAsset
            return bound;
        }

        asset
            .on('setUrl', bindAndMark(this._updateUrlIndex, this))
            .on('serialize', bindAndMark(this._refreshInlineRelations, this))
            .on('dirty', bindAndMark(this._markContainingAssetDirtyIfInline, this));
        this.emit('addAsset', asset);
    },

    _markContainingAssetDirtyIfInline: function (asset) {
        if (asset.isInline) {
            var incomingRelations = this.findRelations({to: asset});
            if (incomingRelations.length !== 1) {
                throw new Error("AssetGraph._markContainingAssetDirtyIfInline assertion error: Expected exactly one incoming relation to inline asset, but found " + incomingRelations.length);
            }
            incomingRelations[0].from.markDirty();
        }
    },

    _refreshInlineRelations: function (asset) {
        this.findRelations({from: asset, to: {isInline: true}}).forEach(function (relation) {
            this._refreshInlineRelations(relation.to);
            if (relation.to.isDirty) {
                relation.to.isDirty = false;
                if (relation._inline) {
                    relation._inline();
                    relation.from.markDirty();
                }
            }
        }, this);
    },

    removeAsset: function (asset, detachIncomingRelations) {
        if (!(asset.id in this.idIndex)) {
            throw new Error("AssetGraph.removeAsset: " + asset + " not in graph");
        }
        ['setUrl', 'serialize'].forEach(function (eventName) {
            var listeners = asset.listeners(eventName);
            for (var i = 0 ; i < listeners.length ; i += 1) {
                if (listeners[i].owner === this) {
                    listeners.splice(i, 1);
                    i -= 1;
                }
            }
        }, this);
        var incomingRelations = this.findRelations({to: asset});
        this.findRelations({from: asset}, true).forEach(function (outgoingRelation) {
            this.removeRelation(outgoingRelation);
            if (outgoingRelation.to.isAsset && outgoingRelation.to.isInline) {
                // Remove inline asset
                this.removeAsset(outgoingRelation.to);
            }
        }, this);
        if (incomingRelations.length) {
            incomingRelations.forEach(function (incomingRelation) {
                if (detachIncomingRelations) {
                    this.detachAndRemoveRelation(incomingRelation);
                } else {
                    this.removeRelation(incomingRelation);
                }
            }, this);
        }
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
        this._removeFromIndices('asset', asset);
        affectedRelations.forEach(function (affectedRelation) {
            this._registerBaseAssetPath(affectedRelation);
        }, this);
        this.emit('removeAsset', asset);
    },

    refreshRelationUrl: function (relation) {
        if (!relation || !relation.isRelation || !relation.to) {
            throw new Error('AssetGraph.refreshRelationUrl: Not a relation: ', relation);
        }
        if (!relation.to.isInline) {
            var relativeUrl = urlTools.buildRelativeUrl(this.getBaseAssetForRelation(relation).url, relation.to.url);
            if (relation.href !== relativeUrl) {
                relation.href = relativeUrl;
                relation.from.markDirty();
            }
        }
    },

    inlineRelation: function (relation) {
        var relationsToAssetToBeInlined = this.findRelations({to: relation.to});
        if (relationsToAssetToBeInlined.length !== 1) {
            // This isn't the only incoming relation, clone the asset before inlining it.
            this.cloneAsset(relation.to, [relation]);
        }
        if (!relation.to.isInline) {
            var affectedRelations = [].concat(this._objInBaseAssetPaths[relation.to.id]);
            affectedRelations.forEach(function (affectedRelation) {
                this._unregisterBaseAssetPath(affectedRelation);
            }, this);

            delete this.urlIndex[relation.to.url];
            relation.to.url = null;
            affectedRelations.forEach(function (affectedRelation) {
                this._registerBaseAssetPath(affectedRelation);
                this.refreshRelationUrl(affectedRelation);
            }, this);
        }
        relation.to.incomingInlineRelation = relation;
        this._refreshInlineRelations(relation.to);
        relation._inline();
        relation.from.markDirty();
    },

    /**
     * Helper function for finding the asset from which the url of a
     * given relation is to be resolved. This is usually the first
     * non-inline containing asset, but for some relation types it's
     * the first Html ancestor -- infamously CssAlphaImageLoader and
     * CssBehavior, but also JavaScriptOneGetStaticUrl.
     * The function returns the complete path to the base asset:
     * [baseAsset, intermediateRelation, asset, ...]
     * but for normal non-inline assets that will just be [baseAsset].
     */
    _findBaseAssetPathForRelation: function (relation) {
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

    getBaseAssetForRelation: function (relation) {
        // Will return undefined if no path is found
        if (relation.id in this.idIndex) {
            return this._baseAssetPathForRelation[relation.id][0];
        } else {
            // The relation isn't in the graph (yet), we'll have to do the computation:
            return this._findBaseAssetPathForRelation(relation)[0];
        }
    },

    /**
     * Run this function if the graph has been in a state where the base asset of any
     * relation couldn't be computed, e.g. if intermediate relations could have been
     * removed and attached again. Will throw an error if the base asset for any
     * relation couldn't be found
     */
    recomputeBaseAssets: function () {
        [].concat(this._relationsWithNoBaseAsset).forEach(function (relation) {
            this._unregisterBaseAssetPath(relation);
            if (!this._registerBaseAssetPath(relation)) {
                throw new Error("recomputeBaseAssets: Couldn't find base asset for " + relation);
            }
        }, this);
    },

    _updateUrlIndex: function (asset, newUrl, oldUrl) {
        if (this._relationsWithNoBaseAsset.length) {
            this.recomputeBaseAssets();
        }
        if (oldUrl) {
            delete this.urlIndex[oldUrl];
        }
        this.urlIndex[newUrl] = asset;
        [].concat(this._objInBaseAssetPaths[asset.id]).forEach(function (affectedRelation) {
            if (!oldUrl) {
                // Un-inlining the asset, need to recompute all base asset paths it's a member of:
                this._unregisterBaseAssetPath(affectedRelation);
                this._registerBaseAssetPath(affectedRelation);
            }
            if (this.getBaseAssetForRelation(affectedRelation) === asset) {
                this.refreshRelationUrl(affectedRelation);
            }
        }, this);
        this.findRelations({to: asset}).forEach(function (incomingRelation) {
            this.refreshRelationUrl(incomingRelation);
        }, this);
    },

    // Add the relations in order, or specify position and adjacentRelation to splice them in later
    addRelation: function (relation, position, adjacentRelation) { // position and adjacentRelation are optional
        if (!relation || !relation.id || !relation.isRelation) {
            throw new Error("AssetGraph.addRelation: " + relation + " is not a relation");
        }
        if (relation.id in this.idIndex) {
            throw new Error("AssetGraph.addRelation: " + relation + " already in graph");
        }
        if (!relation.from || !relation.from.isAsset) {
            throw new Error("AssetGraph.addRelation: 'from' property of relation is not an asset: " + relation.from);
        }
        if (!relation.to || (!relation.to.isAsset && !relation.to.isResolved)) {
            throw new Error("AssetGraph.addRelation: 'to' property of relation is not an asset or a resolved asset config: " + relation.to);
        }
        position = position || 'last';
        if (position === 'last') {
            this._relations.push(relation);
        } else if (position === 'first') {
            this._relations.unshift(relation);
        } else { // Assume 'before' or 'after'
            var i = this._relations.indexOf(adjacentRelation) + (position === 'after' ? 1 : 0);
            this._relations.splice(i, 0, relation);
        }
        this._addToIndices('relation', relation, position, adjacentRelation);
        this._objInBaseAssetPaths[relation.id] = [];
        this._registerBaseAssetPath(relation);
        this.emit('addRelation', relation);
    },

    attachAndAddRelation: function (relation, position, adjacentRelation) {
        relation.from.attachRelation(relation, position, adjacentRelation);
        this.addRelation(relation, position, adjacentRelation);
        this.refreshRelationUrl(relation);
        relation.from.markDirty();
    },

    _registerBaseAssetPath: function (relation) {
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

    _unregisterBaseAssetPath: function (relation) {
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
    },

    removeRelation: function (relation) {
        if (!(relation.id in this.idIndex)) {
            throw new Error("AssetGraph.removeRelation: " + relation + " not in graph");
        }
        var affectedRelations = [].concat(this._objInBaseAssetPaths[relation.id]);
        affectedRelations.forEach(function (affectedRelation) {
            this._unregisterBaseAssetPath(affectedRelation);
        }, this);
        this._unregisterBaseAssetPath(relation);
        this._removeFromIndices('relation', relation);
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
        this.emit('removeRelation', relation);
    },

    detachAndRemoveRelation: function (relation) {
        relation.from.markDirty();
        relation.from.detachRelation(relation);
        this.removeRelation(relation);
    },

    clone: function () {
        var clone = new AssetGraph({root: this.root});
        this._assets.forEach(function (asset) {
            clone.addAsset(asset);
        });
        this._relations.forEach(function (relation) {
            clone.addRelation(relation);
        });
        return clone;
    },

    // Helper method that preserves the position in the indices
    updateRelationTarget: function (relation, newTargetAsset) {
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
        this.refreshRelationUrl(relation);
    },

    // Preserves the url of the old asset.
    replaceAsset: function (oldAsset, newAsset) {
        if (!(oldAsset.id in this.idIndex)) {
            throw new Error("AssetGraph.replaceAsset: Old asset isn't in the graph: " + oldAsset);
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

    cloneAsset: function (asset, incomingRelations) {
        this._refreshInlineRelations(asset);
        var clone = asset._clone();
        if (!asset.isInline) {
            clone.url = urlTools.resolveUrl(asset.url, clone.id + asset.extension);
        }
        if (asset.isInitial) {
            clone.isInitial = true;
        }
        this.addAsset(clone);

        if (incomingRelations) {
            incomingRelations.forEach(function (relation) {
                this.updateRelationTarget(relation, clone);
            }, this);
        }
        this.populateRelationsToExistingAssets(clone, asset);
        return clone;
    },

    populateRelationsToExistingAssets: function (clonedAsset, originalAsset) {
        var cloneOutgoingRelations = clonedAsset.outgoingRelations,
            originalOutgoingRelations = originalAsset.outgoingRelations;
        if (cloneOutgoingRelations.length !== originalOutgoingRelations.length) {
            throw new Error("AssetGraph.populateRelationsToExistingAssets assertion error: The original and the clone don't have the same number of outgoing relations!");
        }
        cloneOutgoingRelations.forEach(function (cloneOutgoingRelation, i) {
            var originalOutgoingRelation = originalOutgoingRelations[i];
            if (originalOutgoingRelation.type !== cloneOutgoingRelation.type) {
                throw new Error("AssetGraph.cloneAsset assertion error: Relation types don't match!");
            }
            cloneOutgoingRelation.isResolved = true;
            if (originalOutgoingRelation.to.isInline) {
                var clonedInlineAsset = AssetGraph.assets.create(cloneOutgoingRelation.to);
                this.addAsset(clonedInlineAsset);
                cloneOutgoingRelation.to = clonedInlineAsset;
                this.addRelation(cloneOutgoingRelation);
                this.populateRelationsToExistingAssets(clonedInlineAsset, originalOutgoingRelation.to);
            } else if (originalOutgoingRelation.to.isResolved) {
                cloneOutgoingRelation.to = originalOutgoingRelation.to;
                this.addRelation(cloneOutgoingRelation);
            }
        }, this);
    }
});

_.extend(AssetGraph.prototype, require('./AssetGraph-transform'));
_.extend(AssetGraph.prototype, require('./AssetGraph-traversal'));

module.exports = AssetGraph;
