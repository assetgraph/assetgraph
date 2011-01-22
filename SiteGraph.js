/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    request = require('request'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    FsLoader = require('./FsLoader'),
    assets = require('./assets'),
    relations = require('./relations'),
    error = require('./error'),
    allIndices = {
        relation: ['id', 'type', 'from', 'to'],
        asset: ['id', 'url', 'type']
    };

var SiteGraph = module.exports = function (config) {
    _.extend(this, config || {});
    this.fsLoader = new FsLoader({root: this.root}); // Does it belong in FsLoader exclusively?
    this.assets = [];
    this.relations = [];
    this.indices = {};
    _.each(allIndices, function (indexNames, indexType) {
        this.indices[indexType] = {};
        indexNames.forEach(function (indexName) {
            this.indices[indexType][indexName] = {};
        }, this);
    }, this);
};

SiteGraph.prototype = {
    addToIndices: function (indexType, obj, position, adjacentObj) { // position and adjacentRelation are optional
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

    removeFromIndices: function (indexType, obj) {
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
                        throw "removeFromIndices: object not found in index!";
                    } else {
                        index[key].splice(i, 1);
                    }
                }
            }
        }, this);
    },

    lookupIndex: function (indexType, indexName, value) {
        return this.indices[indexType][indexName][typeof value === 'object' ? value.id : value] || [];
    },

    existsInIndex: function (indexType, indexName, value) {
        return this.lookupIndex(indexType, indexName, value).length > 0;
    },

    findRelations: function (indexName, value) {
        return this.lookupIndex('relation', indexName, value);
    },

    findAssets: function (indexName, value) {
        return this.lookupIndex('asset', indexName, value);
    },

    registerAsset: function (asset) {
        this.assets.push(asset);
        this.addToIndices('asset', asset);
        return this;
    },

    unregisterAsset: function (asset, cascade) {
        if (cascade) {
            [].concat(this.findRelations('to', asset)).forEach(function (incomingRelation) {
                this.unregisterRelation(incomingRelation);
            }, this);
            [].concat(this.findRelations('from', asset)).forEach(function (outgoingRelation) {
                this.unregisterRelation(outgoingRelation);
            }, this);
        }
        var i = this.assets.indexOf(asset);
        if (i === -1) {
            throw new Error("unregisterAsset: " + asset + " not in graph");
        } else {
            this.assets.splice(i, 1);
        }
        this.removeFromIndices('asset', asset);
        return this;
    },

    assetIsOrphan: function (asset) {
        return !this.findRelations('to', asset).length;
    },

    inlineRelation: function (relation, cb) {
        relation.to.baseUrl = relation.from.baseUrl;
        this.findRelations('from', relation.to).forEach(function (relrel) {
            if (!relrel.isInline) {
                relrel.setUrl(fileUtils.buildRelativeUrl(fileUtils.dirnameNoDot(relrel.from.baseUrl), relrel.to.url));
            }
        }, this);
        relation._inline(cb);
        return this;
    },

    setAssetUrl: function (asset, url) {
        asset.url = url;
        asset.baseUrl = fileUtils.dirnameNoDot(url);
        this.findRelations('to', asset).forEach(function (incomingRelation) {
            if (!incomingRelation.isInline) {
                incomingRelation.setUrl(fileUtils.buildRelativeUrl(incomingRelation.from.baseUrl, url));
            }
        }, this);
        return this;
    },

    // Relations must be registered in order
    registerRelation: function (relation, position, adjacentRelation) { // position and adjacentRelation are optional,
        position = position || 'last';
        if (position === 'last') {
            this.relations.push(relation);
        } else if (position === 'first') {
            this.relations.unshift(relation);
        } else { // Assume 'before' or 'after'
            var i = this.relations.indexOf(adjacentRelation) + (position === 'after' ? 1 : 0);
            this.relations.splice(i, 0, relation);
        }
        this.addToIndices('relation', relation, position, adjacentRelation);
        return this;
    },

    attachAndRegisterRelation: function (relation, position, adjacentRelation) {
        relation.from.attachRelation(relation, position, adjacentRelation);
        this.registerRelation(relation, position, adjacentRelation);
    },

    unregisterRelation: function (relation) {
        this.removeFromIndices('relation', relation);
        var i = this.relations.indexOf(relation);
        if (i === -1) {
            throw new Error("unregisterRelation: " + relation + " not in graph");
        } else {
            this.relations.splice(i, 1);
        }
        return this;
    },

    detachAndUnregisterRelation: function (relation) {
        relation.from.detachRelation(relation);
        this.unregisterRelation(relation);
        return this;
    },

    clone: function () {
        var clone = new SiteGraph();
        this.assets.forEach(function (asset) {
            clone.registerAsset(asset);
        });
        this.relations.forEach(function (relation) {
            clone.registerRelation(relation);
        });
        return clone;
    },

    // This cries out for a rich query facility/DSL!
    lookupSubgraph: function (startAsset, relationLambda) { // preorder
        var that = this,
            subgraph = new SiteGraph();
        (function traverse(asset) {
            if (!subgraph.existsInIndex('asset', 'id', asset)) {
                subgraph.registerAsset(asset);
                that.lookupIndex('relation', 'from', asset).forEach(function (relation) {
                    traverse(relation.to);
                    if (!subgraph.existsInIndex('relation', 'id', relation)) {
                        subgraph.registerRelation(relation);
                    }
                });
            }
        }(startAsset));
        return subgraph;
    },

    loadAsset: function (assetConfig) {
        if ('url' in assetConfig) {
            var lookupUrl = this.lookupIndex('asset', 'url', assetConfig.url);
            if (lookupUrl.length) {
                return lookupUrl[0];
            }
        }
        if (!('baseUrl' in assetConfig)) {
            if ('url' in assetConfig || 'originalUrl' in assetConfig) {
                assetConfig.baseUrl = fileUtils.dirnameNoDot(assetConfig.url || assetConfig.originalUrl);
            } else {
                throw new Error("Couldn't work out baseUrl for asset: " + sys.inspect(assetConfig));
            }
        }
        if (!('type' in assetConfig)) {
            var extension = ('url' in assetConfig) && path.extname(assetConfig.url).replace(/^\./, "");
            if (extension && extension in assets.typeByExtension) {
                assetConfig.type = assets.typeByExtension[extension];
            } else {
                // FIXME: Extract mime type from data: urls
                throw new Error("No type in assetConfig and couldn't work it out from the url: " + sys.inspect(assetConfig));
            }
        }
        var Constructor = assets[assetConfig.type];
        if (!('originalSrc' in assetConfig)) {
            // FIXME: http:, data:
            if (false) {
                assetConfig.originalSrcProxy = function (cb) {
                    request({
                        uri: that.root + assetConfig.url
                    }, function (err, response, body) {
                        if (response.statusCode >= 400) {
                            err = new Error("Got " + response.statusCode + " from remote server!");
                        }
                        cb(err, body);
                    });
                };
            } else {
                assetConfig.originalSrcProxy = this.fsLoader.getOriginalSrcProxy(assetConfig, Constructor.prototype.encoding);
            }
        }
        var asset = new Constructor(assetConfig);
        this.registerAsset(asset);
        return asset;
    },

    // Turn into a transform?
    populate: function (originAsset, includeRelationLambda, cb) {
        var that = this,
            populatedAssets = {};
        (function traverse(asset, cb) {
            if (asset.id in populatedAssets) {
                return cb();
            }
            populatedAssets[asset.id] = true;
            var filteredOriginalRelations;
            step(
                function () {
                    asset.getOriginalRelations(this);
                },
                error.passToFunction(cb, function (originalRelations) {
                    filteredOriginalRelations = originalRelations.filter(includeRelationLambda);
                    if (filteredOriginalRelations.length) {
                        var group = this.group();
                        filteredOriginalRelations.forEach(function (relation) {
                            // FIXME: Don't hardcode fs here
                            that.fsLoader.resolveAssetConfig(relation.assetConfig, relation.from.baseUrl, group());
                        }, this);
                    } else {
                        return cb();
                    }
                }),
                error.passToFunction(cb, function (resolvedAssetConfigArrays) {
                    var initializedRelations = [];
                    function initializeAndRegisterRelation(relation) {
                        if (relation.isInline) {
                            relation.assetConfig.baseUrl = asset.baseUrl;
                        }
                        relation.to = that.loadAsset(relation.assetConfig);
                        if (initializedRelations.length) {
                            that.registerRelation(relation, 'after', initializedRelations[initializedRelations.length - 1]);
                        } else {
                            that.registerRelation(relation, 'first');
                        }
                        initializedRelations.push(relation);
                    }
                    resolvedAssetConfigArrays.forEach(function (resolvedAssetConfigs, i) {
                        var originalRelation = filteredOriginalRelations[i];
                        if (resolvedAssetConfigs.length === 0) {
                            asset.detachRelation(originalRelation);
                        } else if (resolvedAssetConfigs.length === 1) {
                            originalRelation.assetConfig = resolvedAssetConfigs[0];
                            initializeAndRegisterRelation(originalRelation);
                        } else if (asset.attachRelation) {
                            resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                                var relation = new originalRelation.constructor({
                                    from: asset,
                                    assetConfig: resolvedAssetConfig
                                });
                                relation.from.attachRelation(relation, 'before', originalRelation);
                                initializeAndRegisterRelation(relation);
                            });
                            asset.detachRelation(originalRelation);
                        } else {
                            cb(new Error("assetConfig resolved to multiple, and " + originalRelation.type + " doesn't support attachRelation"));
                        }
                    }, this);
                    if (initializedRelations.length) {
                        initializedRelations.forEach(function (relation) {
                            traverse(relation.to, this.parallel());
                        }, this);
                    } else {
                        process.nextTick(this);
                    }
                }),
                cb
            );
        })(originAsset, function (err) {
            cb(err, that);
        });
    }
};
