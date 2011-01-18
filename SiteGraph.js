/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    relations = require('./relations'),
    error = require('./error'),
    allIndices = {
        relation: ['id', 'type', 'from', 'to'],
        asset: ['id', 'url', 'type']
    };

var SiteGraph = module.exports = function (config) {
    _.extend(this, config || {});
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
    },

    setAssetUrl: function (asset, url) {
        asset.url = url;
        asset.baseUrl = fileUtils.dirnameNoDot(url);
        this.findRelations('to', asset).forEach(function (incomingRelation) {
            if (!incomingRelation.isInline) {
                incomingRelation.setUrl(fileUtils.buildRelativeUrl(incomingRelation.from.baseUrl, url));
            }
        }, this);
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
    },

    detachAndUnregisterRelation: function (relation) {
        relation.from.detachRelation(relation);
        this.unregisterRelation(relation);
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
        function traverse (asset) {
            if (!subgraph.existsInIndex('asset', 'id', asset)) {
                subgraph.registerAsset(asset);
                that.lookupIndex('relation', 'from', asset).forEach(function (relation) {
                    traverse(relation.to);
                    if (!subgraph.existsInIndex('relation', 'id', relation)) {
                        subgraph.registerRelation(relation);
                    }
                });
            }
        }
        traverse(startAsset);
        return subgraph;
    }
};
