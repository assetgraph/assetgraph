var util = require('util'),
    _ = require('underscore'),
    step = require('step'),
    fileUtils = require('./fileUtils'),
    assets = require('./assets'),
    relations = require('./relations'),
    AssetConfigResolver = require('./AssetConfigResolver'),
    query = require('./query'),
    error = require('./error');

function AssetGraph(resolverConfig) {
    this.resolver = new AssetConfigResolver(resolverConfig);
    this.assets = [];
    this.relations = [];
    this.indices = {};
    this.urlIndex = {};
    this.idIndex = {};
    this._baseAssetPathForRelation = {};
    this._objInBaseAssetPaths = {};
    this._relationsWithNoBaseAsset = [];
    _.each(query.indices, function (indexNames, indexType) {
        this.indices[indexType] = {};
        indexNames.forEach(function (indexName) {
            this.indices[indexType][indexName] = {};
        }, this);
    }, this);
};

AssetGraph.prototype = {
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
        var that = this,
            incoming = queryObj && queryObj.incoming,
            outgoing = queryObj && queryObj.outgoing;
        if (incoming || outgoing) {
            queryObj = _.extend({}, queryObj);
            delete queryObj.incoming;
            delete queryObj.outgoing;
        }
        var results = query.queryAssetGraph(this, 'asset', queryObj);
        if (incoming) {
            results = results.filter(function (asset) {
                return that.findRelations(_.extend({to: asset}, incoming)).length > 0;
            });
        }
        if (outgoing) {
            results = results.filter(function (asset) {
                return that.findRelations(_.extend({from: asset}, incoming)).length > 0;
            });
        }
        return results;
    },

    findRelations: function (queryObj) {
        return query.queryAssetGraph(this, 'relation', queryObj);
    },

    // "root/relative/path.html"
    // "file:///home/foo/thething.jpg"
    // "http://example.com/hereiam.css"
    // {rawSrc: "thesource", type: "CSS"}
    addAsset: function (asset) {
        if (asset.url && asset.url in this.urlIndex) {
            throw new Error("AssetGraph.addAsset: " + asset.url + " already loaded");
        }
        this.assets.push(asset);
        this._addToIndices('asset', asset);
        this._objInBaseAssetPaths[asset.id] = [];
    },

    removeAsset: function (asset, cascade) { // Perhaps just cascade by default?
        if (cascade) {
            this.findRelations({to: asset}).forEach(function (incomingRelation) {
                this.removeRelation(incomingRelation);
            }, this);
            this.findRelations({from: asset}).forEach(function (outgoingRelation) {
                this.removeRelation(outgoingRelation);
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
    },

    markAssetDirty: function (asset) {
        asset.isDirty = true;
    },

    assetIsOrphan: function (asset) {
        return !this.findRelations({to: asset}).length;
    },

    inlineAsset: function (asset, cb) {
        var affectedRelations = [].concat(this._objInBaseAssetPaths[asset.id]);
        affectedRelations.forEach(function (affectedRelation) {
            this._unregisterBaseAssetPath(affectedRelation);
        }, this);

        var incomingRelations = this.findRelations({to: asset});
        if (incomingRelations.length !== 1) {
            // FIXME: Maybe create a copy instead of complaining?
            throw new Error("AssetGraph.inlineAsset " + asset + " has " + incomingRelations.length + " incoming relations, cannot inline");
        }
        if (asset.url) {
            delete this.urlIndex[asset.url];
            delete asset.url;
        }
        this.markAssetDirty(incomingRelations[0].from);
        affectedRelations.forEach(function (affectedRelation) {
            this._registerBaseAssetPath(affectedRelation);
            if (affectedRelation.to.url) {
                affectedRelation._setRawUrlString(fileUtils.buildRelativeUrl(this.getBaseAssetForRelation(affectedRelation).url, affectedRelation.to.url));
                this.markAssetDirty(affectedRelation.from);
            }
        }, this);
        this.serializeAsset(asset, error.passToFunction(cb, function (src) {
            incomingRelations[0]._inline(src);
            cb();
        }));
    },

    _refreshInlineAssets: function (asset, cb) {
        var that = this;
        step(
            function () {
                var group = this.group();
                that.findRelations({from: asset, to: {url: query.undefined}}).forEach(function (relation) {
                    var callback = group();
                    that._refreshInlineAssets(relation.to, error.passToFunction(callback, function () {
                        if (relation.to.isDirty) {
                            that.serializeAsset(relation.to, error.passToFunction(callback, function (src) {
                                relation._inline(src);
                                callback();
                            }));
                            relation.to.isDirty = false;
                        } else {
                            process.nextTick(callback);
                        }
                    }));
                });
                process.nextTick(group());
            },
            cb
        );
    },

    serializeAsset: function (asset, cb) {
        this._refreshInlineAssets(asset, error.passToFunction(cb, function () {
            asset.serialize(cb);
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
                if (affectedRelation.to.url) {
                    affectedRelation._setRawUrlString(fileUtils.buildRelativeUrl(asset.url, affectedRelation.to.url));
                }
                this.markAssetDirty(asset);
            }
        }, this);
        this.findRelations({to: asset}).forEach(function (incomingRelation) {
            incomingRelation._setRawUrlString(fileUtils.buildRelativeUrl(this.getBaseAssetForRelation(incomingRelation).url, url));
            this.markAssetDirty(incomingRelation.from);
        }, this);
    },

    // Add the relations in order, or specify position and adjacentRelation to splice them in later
    addRelation: function (relation, position, adjacentRelation) { // position and adjacentRelation are optional,
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
    },

    attachAndAddRelation: function (relation, position, adjacentRelation) {
        relation.from.attachRelation(relation, position, adjacentRelation);
        this.addRelation(relation, position, adjacentRelation);
        if (relation.to.url) {
            relation._setRawUrlString(fileUtils.buildRelativeUrl(this.getBaseAssetForRelation(relation).url, relation.to.url));
        }
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

    // Add your callback as the last transform at the end of the list
    transform: function () { // ...
        var that = this,
            transforms = _.toArray(arguments),
            nextStepNo = 0,
            startTime = new Date(),
            isVows = process.argv.length >= 1 && /vows$/.test(process.argv[1]);
        function proceed(err) {
            if (nextStepNo > 0) {
                var endTime = new Date();
                if (!isVows) {
                    console.log(((endTime - startTime) / 1000).toFixed(3) + " secs: " + (transforms[nextStepNo - 1].name || '(unknown)') + (err ? " [error]" : ""));
                }
                startTime = endTime;
            }
            if (nextStepNo < transforms.length) {
                var nextTransform = transforms[nextStepNo];
                nextStepNo += 1;
                try {
                    nextTransform(err || null, that, proceed);
                } catch (e) {
                    proceed(e);
                }
            } else if (err) {
                console.log(err.stack || err);
            }
        }
        proceed();
    }
};

module.exports = AssetGraph;
