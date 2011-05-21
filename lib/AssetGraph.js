var util = require('util'),
    crypto = require('crypto'),
    events = require('events'),
    _ = require('underscore'),
    seq = require('seq'),
    urlTools = require('./util/urlTools'),
    assets = require('./assets'),
    relations = require('./relations'),
    AssetConfigResolver = require('./AssetConfigResolver'),
    query = require('./query'),
    error = require('./util/error');

function AssetGraph(resolverConfig) {
    events.EventEmitter.call(this);
    this.resolver = new AssetConfigResolver(resolverConfig);
    this.assets = [];
    this.relations = [];
    this.indices = {};
    this.urlIndex = {};
    this.idIndex = {};
    this._baseAssetPathForRelation = {};
    this._objInBaseAssetPaths = {};
    this._relationsWithNoBaseAsset = [];
    this._transformQueue = [];
    _.each(query.indices, function (indexNames, indexType) {
        this.indices[indexType] = {};
        indexNames.forEach(function (indexName) {
            this.indices[indexType][indexName] = {};
        }, this);
    }, this);
};

util.inherits(AssetGraph, events.EventEmitter);

_.extend(AssetGraph.prototype, {
    _addToIndices: function (indexType, obj, position, adjacentObj) { // position and adjacentRelation are optional
        this.idIndex[obj.id] = obj;
        if (indexType === 'asset' && obj.url) {
            this.urlIndex[obj.url] = obj;
        }
        query.indices[indexType].forEach(function (indexName) {
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
                    var index = this.indices[indexType][indexName];
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
        query.indices[indexType].forEach(function (indexName) {
            if (indexName in obj) {
                var type = typeof obj[indexName],
                    key;
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    key = obj[indexName];
                } else if (type === 'object' && 'id' in obj[indexName]) {
                    key = obj[indexName].id;
                }
                if (typeof key !== 'undefined') {
                    var index = this.indices[indexType][indexName],
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
        return this.indices[indexType][indexName][typeof value === 'object' ? value.id : value] || [];
    },

    findAssets: function (queryObj) {
        return query.queryAssetGraph(this, 'asset', queryObj);
    },

    findRelations: function (queryObj) {
        return query.queryAssetGraph(this, 'relation', queryObj);
    },

    // "root/relative/path.html"
    // "file:///home/foo/thething.jpg"
    // "http://example.com/hereiam.css"
    // {rawSrc: "thesource", type: "CSS"}
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
        this.assets.push(asset);
        this._addToIndices('asset', asset);
        this._objInBaseAssetPaths[asset.id] = [];
        this.emit('addAsset', asset);
    },

    removeAsset: function (asset, detachIncomingRelations) {
        if (!(asset.id in this.idIndex)) {
            throw new Error("AssetGraph.removeAsset: " + asset + " not in graph");
        }
        var incomingRelations = this.findRelations({to: asset});
        this.findRelations({from: asset}).forEach(function (outgoingRelation) {
            this.removeRelation(outgoingRelation);
            if (!outgoingRelation.to.url) {
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
        var assetIndex = this.assets.indexOf(asset);
        if (assetIndex === -1) {
            throw new Error("removeAsset: " + asset + " not in graph");
        } else {
            this.assets.splice(assetIndex, 1);
        }
        this._removeFromIndices('asset', asset);
        affectedRelations.forEach(function (affectedRelation) {
            this._registerBaseAssetPath(affectedRelation);
        }, this);
        this.emit('removeAsset', asset);
    },

    markAssetDirty: function (asset) {
        asset.isDirty = true;
        delete asset.serializedSrc;
        delete asset.serializedSize;
    },

    refreshRelationUrl: function (relation) {
        if (relation.to.url) {
            var relativeUrl = urlTools.buildRelativeUrl(this.getBaseAssetForRelation(relation).url, relation.to.url);
            if (relation._getRawUrlString() !== relativeUrl) {
                relation._setRawUrlString(relativeUrl);
                this.markAssetDirty(relation.from);
            }
        }
    },

    inlineRelation: function (relation, cb) {
        var that = this,
            incomingRelations = that.findRelations({to: relation.to});
        if (incomingRelations.length !== 1) {
            // This isn't the only incoming relation, clone the asset before inlining it.
            that.cloneAsset(relation.to, [relation], error.passToFunction(cb, function () {
                that.inlineRelation(relation, cb);
            }));
            return;
        }
        if (relation.to.url) {
            var affectedRelations = [].concat(that._objInBaseAssetPaths[relation.to.id]);
            affectedRelations.forEach(function (affectedRelation) {
                that._unregisterBaseAssetPath(affectedRelation);
            });

            delete that.urlIndex[relation.to.url];
            delete relation.to.url;
            affectedRelations.forEach(function (affectedRelation) {
                that._registerBaseAssetPath(affectedRelation);
                that.refreshRelationUrl(affectedRelation);
            });
        }
        that.markAssetDirty(incomingRelations[0].from);
        that._refreshInlineAssets(relation.to, error.passToFunction(cb, function () {
            incomingRelations[0]._inline(cb);
        }));
    },

    _refreshInlineAssets: function (asset, cb) {
        var that = this;
        seq.ap(that.findRelations({from: asset, to: {url: query.undefined}}))
            .parEach(function (relation) {
                var callback = this;
                that._refreshInlineAssets(relation.to, error.passToFunction(callback, function () {
                    if (relation.to.isDirty) {
                        relation.to.isDirty = false;
                        if (relation._inline) {
                            // Some read-only "assets" such as SpriteConfiguration don't support _inline
                            return relation._inline(callback);
                        }
                    }
                    callback();
                }));
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    },

    getAssetText: function (asset, cb) {
        this._refreshInlineAssets(asset, error.passToFunction(cb, function () {
            asset.getText(cb);
        }));
    },

    getSerializedAsset: function (asset, cb) {
        this._refreshInlineAssets(asset, error.passToFunction(cb, function () {
            asset.getSerializedSrc(cb);
        }));
    },

    getAssetMD5Hex: function (asset, cb) {
        this.getSerializedAsset(asset, error.passToFunction(cb, function (rawSrc) {
            cb(null, crypto.createHash('md5').update(rawSrc).digest('hex'));
        }));
    },

    /**
     * Helper function for finding the asset from which the url of a
     * given relation is to be resolved. This is usually the first
     * non-inline containing asset, but for some relation types it's
     * the first HTML ancestor -- infamously CSSAlphaImageLoader and
     * CSSBehavior, but also JavaScriptStaticUrl.
     * The function returns the complete path to the base asset:
     * [baseAsset, intermediateRelation, asset, ...]
     * but for normal non-inline assets that will just be [baseAsset].
     */
    _findBaseAssetPathForRelation: function (relation) {
        var baseAssetMatcher = query.queryObjToMatcherFunction(relation.baseAssetQuery),
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
        if (relation.id in this.relations) {
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

    setAssetUrl: function (asset, url) {
        if (this._relationsWithNoBaseAsset.length) {
            this.recomputeBaseAssets();
        }

        var oldUrl = asset.url;
        if (oldUrl) {
            delete this.urlIndex[oldUrl];
        }
        asset.url = url;
        this.urlIndex[asset.url] = asset;
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
        position = position || 'last';
        if (position === 'last') {
            this.relations.push(relation);
        } else if (position === 'first') {
            this.relations.unshift(relation);
        } else { // Assume 'before' or 'after'
            var i = this.relations.indexOf(adjacentRelation) + (position === 'after' ? 1 : 0);
            this.relations.splice(i, 0, relation);
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
        this.markAssetDirty(relation.from);
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
        var relationIndex = this.relations.indexOf(relation);
        if (relationIndex === -1) {
            throw new Error("removeRelation: " + relation + " not in graph");
        } else {
            this.relations.splice(relationIndex, 1);
        }
        delete this._objInBaseAssetPaths[relation.id];
        affectedRelations.forEach(function (affectedRelation) {
            this._registerBaseAssetPath(affectedRelation);
        }, this);
        this.emit('removeRelation', relation);
    },

    detachAndRemoveRelation: function (relation) {
        this.markAssetDirty(relation.from);
        relation.from.detachRelation(relation);
        this.removeRelation(relation);
    },

    clone: function () {
        var clone = new AssetGraph();
        this.assets.forEach(function (asset) {
            clone.addAsset(asset);
        });
        this.relations.forEach(function (relation) {
            clone.addRelation(relation);
        });
        return clone;
    },

    populateRelationsToExistingAssets: function (initialAsset, cb) {
        var that = this,
            assetQueue = [initialAsset],
            numOutstandingCallbacks = 0;

        cb = error.onlyCallOnce(cb);

        function processAsset(asset, cb) {
            // FIXME: Butchered from transforms.populate. Put into a common helper function somewhere.
            var lastSeenRelation;

            function initializeAndAddRelation(relation) {
                if (!relation.to.url) {
                    // Inline asset, add a copy
                    relation.to = assets.create(relation.to);
                    that.addAsset(relation.to);
                    assetQueue.push(relation.to);
                } else if (relation.to.url in that.urlIndex) {
                    // Relation to an asset that already exists in the graph
                    relation.to = that.urlIndex[relation.to.url];
                } else {
                    return;
                }
                if (lastSeenRelation) {
                    that.addRelation(relation, 'after', lastSeenRelation);
                } else {
                    that.addRelation(relation, 'first');
                }
                lastSeenRelation = relation;
            }

            seq()
                .seq(function () {
                    asset.getOriginalRelations(this);
                })
                .flatten()
                .parEach(function (originalRelation) {
                    that.resolver.resolve(originalRelation.to, that.getBaseAssetForRelation(originalRelation).url, this.into(originalRelation.id));
                })
                .parEach(function (originalRelation) {
                    var resolvedAssetConfigs = this.vars[originalRelation.id],
                        lastSeenRelation;
                    if (!_.isArray(resolvedAssetConfigs)) {
                        // Simple case
                        resolvedAssetConfigs = [resolvedAssetConfigs];
                    }
                    if (resolvedAssetConfigs.length === 0) {
                        asset.detachRelation(originalRelation);
                    } else if (resolvedAssetConfigs.length === 1) {
                        originalRelation.to = resolvedAssetConfigs[0];
                        initializeAndAddRelation(originalRelation);
                    } else if (asset.attachRelation) {
                        resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                            var relation = new originalRelation.constructor({
                                from: asset,
                                to: resolvedAssetConfig
                            });
                            initializeAndAddRelation(relation);
                            relation.from.attachRelation(relation, 'before', originalRelation);
                        });
                        asset.detachRelation(originalRelation);
                    } else {
                        cb(new Error("assetConfig resolved to multiple, but " + originalRelation.type + " doesn't support attachRelation"));
                    }
                    this();
                })
                .seq(function () {
                    cb();
                })
                ['catch'](cb);
        }

        function proceed() {
            while (assetQueue.length) {
                var asset = assetQueue.pop();
                numOutstandingCallbacks += 1;
                processAsset(asset, error.passToFunction(cb, function () {
                    numOutstandingCallbacks -= 1;
                    proceed();
                }));
            }
            if (!numOutstandingCallbacks) {
                cb();
            }
        }
        proceed();
    },

    updateRelationTarget: function (relation, newTarget) {
        // Helper method that preserves the position in the indices
        var i = this.indices.relation.to[relation.to.id].indexOf(relation);
        if (i === -1) {
            throw new Error("assetGraph.updateRelationTarget: Relation not in graph: " + relation);
        }
        this.indices.relation.to[relation.to.id].splice(i, 1);
        relation.to = newTarget;
        (this.indices.relation.to[relation.to.id] = this.indices.relation.to[relation.to.id] || []).push(relation),
        this.refreshRelationUrl(relation);
    },

    // Preserves the url of the old asset.
    replaceAsset: function (oldAsset, newAsset) {
        this.addAsset(newAsset);
        this.findRelations({to: oldAsset}).forEach(function (incomingRelation) {
            this.updateRelationTarget(incomingRelation, newAsset);
        }, this);
        this.removeAsset(oldAsset);
        if (oldAsset.url) {
            this.setAssetUrl(newAsset, oldAsset.url);
        }
    },

    cloneAsset: function (asset, incomingRelations, cb) {
        var that = this;
        if (!cb) {
            cb = incomingRelations;
            incomingRelations = [];
        }
        asset._clone(error.passToFunction(cb, function (assetClone) {
            if (asset.url) {
                assetClone.url = urlTools.resolveUrl(asset.url, assetClone.id + asset.getExtension());
            }
            if (asset.isInitial) {
                assetClone.isInitial = true;
            }
            that.addAsset(assetClone);

            incomingRelations.forEach(function (relation) {
                that.updateRelationTarget(relation, assetClone);
            });
            that.populateRelationsToExistingAssets(assetClone, error.passToFunction(cb, function () {
                cb(null, assetClone);
            }));
        }));
    },

    createSubgraph: function (startAsset, relationQuery) {
        var that = this,
            subgraph = new AssetGraph();
        (function traverse(asset) {
            if (!(asset.id in subgraph.idIndex)) {
                subgraph.addAsset(asset);
                that.findRelations(_.extend({from: asset}, relationQuery)).forEach(function (relation) {
                    if (!(relation.id in subgraph.idIndex)) {
                        subgraph.addRelation(relation);
                    }
                    traverse(relation.to);
                });
            }
        }(startAsset));
        return subgraph;
    },

    runTransform: function (transform, cb) {
        var that = this,
            startTime = new Date();
        that.emit('beforeTransform', transform);
        transform(that, function (err) {
            if (err) {
                return cb(err);
            }
            that.emit('afterTransform', transform, new Date().getTime() - startTime);
            cb();
        });
        return that;
    },

    _proceedWithNextTransform: function () {
        var that = this;
        // Skip past falsy transforms:
        while (that._transformQueue.length && !that._transformQueue[0]) {
            that._transformQueue.shift();
        }
        if (that._transformQueue.length) {
            that.runTransform(that._transformQueue.shift(), function (err) {
                if (err) {
                    if (that._onComplete) {
                        that._onComplete(err);
                    } else {
                        that.emit('error', err);
                    }
                } else {
                    that._proceedWithNextTransform();
                }
            });
        } else {
            if (that._onComplete) {
                that._onComplete(null, that);
            }
        }
    },

    queue: function () { // ...
        Array.prototype.push.apply(this._transformQueue, arguments);
        return this;
    },

    run: function (cb) {
        this._onComplete = cb;
        this._proceedWithNextTransform();
        return this;
    }
});

module.exports = AssetGraph;
