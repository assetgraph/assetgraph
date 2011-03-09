var util = require('util'),
    _ = require('underscore'),
    step = require('step'),
    fileUtils = require('./fileUtils'),
    assets = require('./assets'),
    relations = require('./relations'),
    AssetConfigResolver = require('./AssetConfigResolver'),
    query = require('./query'),
    error = require('./error'),
    allIndices = {
        relation: ['type', 'from', 'to'],
        asset: ['type', 'isInitial']
    };

function AssetGraph(resolverConfig) {
    this.resolver = new AssetConfigResolver(resolverConfig);
    this.assets = [];
    this.relations = [];
    this.indices = {};
    this.assetsById = {};
    this.relationsById = {};
    this.assetsByUrl = {};
    this.baseAssetPathForRelation = {};
    this.relationInBaseAssetPaths = {};
    this.assetInBaseAssetPaths = {};
    this.numRelationsWithNoBaseAsset = 0;
    _.each(allIndices, function (indexNames, indexType) {
        this.indices[indexType] = {};
        indexNames.forEach(function (indexName) {
            this.indices[indexType][indexName] = {};
        }, this);
    }, this);
};

AssetGraph.prototype = {
    _addToIndices: function (indexType, obj, position, adjacentObj) { // position and adjacentRelation are optional
        if (indexType === 'asset') {
            this.assetsById[obj.id] = obj;
            if (obj.url) {
                this.assetsByUrl[obj.url] = obj;
            }
        } else {
            this.relationsById[obj.id] = obj;
        }
        allIndices[indexType].forEach(function (indexName) {
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
        if (indexType === 'asset') {
            if (obj.url) {
                delete this.assetsByUrl[obj.url];
            }
            delete this.assetsById[obj.id];
        } else {
            delete this.relationsById[obj.id];
        }
        allIndices[indexType].forEach(function (indexName) {
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

    _query: function (type, queryObj) {
        var that = this,
            numFields = 0,
            shortestIndexLookup;
        _.each(queryObj || {}, function (query, fieldName) {
            numFields += 1;
            var indexLookup;
            if (allIndices[type].indexOf(fieldName) !== -1) {
                if (_.isArray(query) && query.every(function (item) {
                    // Don't attempt index lookups if the array contains a query.not or something even worse:
                    return item.isAsset || item.isRelation || /^(?:string|boolean|number)$/.test(item);
                })) {
                    indexLookup = [];
                    query.forEach(function (value) {
                        Array.prototype.push.apply(indexLookup, that._lookupIndex(type, fieldName, value));
                    });
                } else {
                    var queryType = typeof query;
                    if (queryType === 'string' || queryType === 'boolean' || queryType === 'number' || query.isAsset || query.isRelation) {
                        indexLookup = that._lookupIndex(type, fieldName, query);
                    }
                }
                if (indexLookup && (!shortestIndexLookup || indexLookup.length < shortestIndexLookup.length)) {
                    shortestIndexLookup = indexLookup;
                }
            }
        });
        if (shortestIndexLookup && numFields === 1) {
            return [].concat(shortestIndexLookup);
        } else {
            return (shortestIndexLookup || that[type + 's']).filter(query.queryObjToMatcherFunction(queryObj));
        }
    },

    findAssets: function (queryObj) {
        return this._query('asset', queryObj);
    },

    findRelations: function (queryObj) {
        return this._query('relation', queryObj);
    },

    // "root/relative/path.html"
    // "file:///home/foo/thething.jpg"
    // "http://example.com/hereiam.css"
    // {originalSrc: "thesource", type: "CSS"}
    addAsset: function (asset) {
        if (asset.url && asset.url in this.assetsByUrl) {
            throw new Error("AssetGraph.addAsset: " + asset.url + " already loaded");
        }
        this.assets.push(asset);
        this._addToIndices('asset', asset);
        this.assetInBaseAssetPaths[asset.id] = [];
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
        if (this.assetInBaseAssetPaths[asset.id].length) {
            throw new Error("removeAsset: Cannot remove " + relation + ", it's in the baseAssetPath at least one relation");
        }
        delete this.assetInBaseAssetPaths[asset.id];
        var assetIndex = this.assets.indexOf(asset);
        if (assetIndex === -1) {
            throw new Error("removeAsset: " + asset + " not in graph");
        } else {
            this.assets.splice(assetIndex, 1);
        }
        this._removeFromIndices('asset', asset);
    },

    markAssetDirty: function (asset) {
        asset.isDirty = true;
    },

    assetIsOrphan: function (asset) {
        return !this.findRelations({to: asset}).length;
    },

    inlineRelation: function (relation, cb) {
        var incomingRelationsForTarget = this.findRelations({to: relation.to});
        if (incomingRelationsForTarget.length !== 1) {
            // FIXME: Maybe create a copy instead of complaining?
            throw new Error("AssetGraph.inlineRelation " + relation + ": Target asset has " + incomingRelationsForTarget.length + " incoming relations, cannot inline");
        }
        if (relation.to.url) {
            delete this.assetsByUrl[relation.to.url];
            delete relation.to.url;
        }
        this.markAssetDirty(relation.from);
        this.assetInBaseAssetPaths[relation.to.id].forEach(function (affectedRelation) {
            this._unregisterBaseAssetPath(affectedRelation);
            this._registerBaseAssetPath(affectedRelation);
            if (affectedRelation.to.url) {
                affectedRelation._setRawUrlString(fileUtils.buildRelativeUrl(this.getBaseAssetForRelation(affectedRelation).url, affectedRelation.to.url));
                this.markAssetDirty(affectedRelation.from);
            }
        }, this);
        relation._inline(cb);
    },

    _refreshInlineRelations: function (asset, cb) {
        var that = this;
        step(
            function () {
                var group = this.group();
                that.findRelations({from: asset, to: {url: query.undefined}}).forEach(function (relation) {
                    var callback = group();
                    that._refreshInlineRelations(relation.to, error.passToFunction(callback, function () {
                        if (relation.to.isDirty) {
                            relation._inline(callback);
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
        this._refreshInlineRelations(asset, error.passToFunction(cb, function () {
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
            return this.baseAssetPathForRelation[relation.id][0];
        } else {
            return this._findBaseAssetPathForRelation(relation)[0];
        }
    },

    setAssetUrl: function (asset, url) {
        if (this.numRelationsWithNoBaseAsset) {
            throw new Error("setAssetUrl: Graph contains relations for which no base asset could be found, setAssetUrl not permitted.");
        }

        var oldUrl = asset.url;
        if (oldUrl) {
            delete this.assetsByUrl[oldUrl];
        }
        asset.url = url;
        this.assetsByUrl[asset.url] = asset;
        this.assetInBaseAssetPaths[asset.id].forEach(function (relation) {
            if (!oldUrl) {
                // Un-inlining the asset, need to recompute all base asset paths it's a member of:
                this._unregisterBaseAssetPath(relation);
                this._registerBaseAssetPath(relation);
            }
            if (this.getBaseAssetForRelation(relation) === asset) {
                if (relation.to.url) {
                    relation._setRawUrlString(fileUtils.buildRelativeUrl(asset.url, relation.to.url));
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
        this.baseAssetPathForRelation[relation.id] = baseAssetPath;
        this.relationInBaseAssetPaths[relation.id] = [];
        for (var i = 0 ; i < baseAssetPath.length ; i += 1) {
            if (i % 2) {
                // Relation
                this.relationInBaseAssetPaths[baseAssetPath[i].id].push(relation);
            } else {
                // Asset
                this.assetInBaseAssetPaths[baseAssetPath[i].id].push(relation);
            }
        }
        if (baseAssetPath.length === 0) {
            this.numRelationsWithNoBaseAsset += 1;
        }
    },

    _unregisterBaseAssetPath: function (relation) {
        var baseAssetPath = this.baseAssetPathForRelation[relation.id];
        for (var i = 0 ; i < baseAssetPath.length ; i += 1) {
            if (i % 2) {
                // Relation
                this.relationInBaseAssetPaths[baseAssetPath[i].id].splice(this.relationInBaseAssetPaths[baseAssetPath[i].id].indexOf(relation), 1);
            } else {
                // Asset
                this.assetInBaseAssetPaths[baseAssetPath[i].id].splice(this.assetInBaseAssetPaths[baseAssetPath[i].id].indexOf(relation), 1);
            }
        }
        delete this.baseAssetPathForRelation[relation.id];
        if (baseAssetPath.length === 0) {
            this.numRelationsWithNoBaseAsset -= 1;
        }
    },

    removeRelation: function (relation) {
        if (this.relationInBaseAssetPaths[relation.id].length) {
            throw new Error("removeRelation: Cannot remove " + relation + ", it's in the baseAssetPath for at least one other relation");
        }
        this._unregisterBaseAssetPath(relation);
        this._removeFromIndices('relation', relation);
        var relationIndex = this.relations.indexOf(relation);
        if (relationIndex === -1) {
            throw new Error("removeRelation: " + relation + " not in graph");
        } else {
            this.relations.splice(relationIndex, 1);
        }
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
            if (!(asset.id in subgraph.assetsById)) {
                subgraph.addAsset(asset);
                that.findRelations(_.extend({from: asset}, relationQuery)).forEach(function (relation) {
                    if (!(relation.id in subgraph.relationsById)) {
                        subgraph.addRelation(relation);
                    }
                    if (relation.to) {
                        traverse(relation.to);
                    } else {
                        console.log("assetGraph.createSubgraph: No 'to' attribute found on " + relation + " -- not populated yet?");
                    }
                });
            }
        }(startAsset));
        return subgraph;
    },

    // Add your callback as the last transform at the end of the list
    transform: function () { // ...
        var that = this,
            transforms = _.toArray(arguments),
            nextStepNo = 0;
        function executeNextStep (err) {
            if (err) {
                throw err;
            }
            if (nextStepNo < transforms.length) {
                var nextTransform = transforms[nextStepNo],
                    startTime = new Date();
                nextStepNo += 1;
                nextTransform(null, that, error.logAndExit(function () {
//                    console.log(nextTransform.name + ': ' + (new Date() - startTime));
                    executeNextStep();
                }));
            }
        }
        executeNextStep();
    }
};

module.exports = AssetGraph;
