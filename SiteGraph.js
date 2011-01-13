/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    relations = require('./relations'),
    _ = require('underscore'),
    graphviz = require('graphviz'),
    error = require('./error');

var SiteGraph = module.exports = function (config) {
    _.extend(this, config || {});
    this.nextAssetId = 1;
    this.nextRelationId = 1;
    this.assets = [];
    this.relations = [];

    this.indexNames = {
        relation: ['url', 'type', 'from', 'to'],
        asset: ['url', 'type']
    };
    this.indices = {};
    _.each(this.indexNames, function (indexNames, indexType) {
       this.indices[indexType] = {};
       indexNames.forEach(function (indexName) {
           this.indices[indexType][indexName] = {};
       }, this);
    }, this);
};

SiteGraph.prototype = {
    addToIndex: function (indexType, obj) {
        this.indexNames[indexType].forEach(function (indexName) {
            if (indexName in obj) {
                var type = typeof obj[indexName],
                    key;
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    key = obj[indexName];
                } else if (type === 'object' && 'id' in obj[indexName]) {
                    key = obj.id;
                }
                if (typeof key !== 'undefined') {
                    var index = this.indices[indexType][indexName];
                    (index[key] = index[key] || []).push(obj);
                }
            }
        }, this);
    },

    lookupIndex: function (indexType, indexName, value) {
        return this.indices[indexType][indexName][value] || [];
    },

    registerAsset: function (asset) {
        asset.id = this.nextAssetId;
        this.nextAssetId += 1;
        this.assets.push(asset);
        this.addToIndex('asset', asset);
    },

    // Relations must be registered in order
    registerRelation: function (relation) {
        relation.id = this.nextRelationId;
        this.nextRelationId += 1;
        this.relations.push(relation);
        this.addToIndex('relation', relation);
    },

    // This cries out for a rich query facility/DSL!
    queryRelationsDeep: function (startAsset, relationLambda) { // preorder
        var that = this,
            result = [],
            seenAssets = {},
            seenRelations = {};
        function traverse (asset) {
            if (asset.id in seenAssets) {
                return;
            } else {
                seenAssets[asset.id] = true;
                that.relations.filter(function (relation) {
                    return relation.from === asset;
                }).filter(relationLambda).forEach(function (relation) {
                    traverse(relation.to);
                    if (!(relation.id in seenRelations)) {
                        result.push(relation);
                        seenRelations[relation.id] = true;
                    }
                });
            }
        }
        traverse(startAsset);
        return result;
    },

    toGraphViz: function () {
        var g = graphviz.digraph("G");
        this.getAssetTypes().forEach(function (assetType) {
            this.assetsByType[assetType].forEach(function (asset) {
                g.addNode(asset.id.toString(), {label: 'url' in asset ? path.basename(asset.url) : 'inline'});
            }, this);
        }, this);
        this.getRelationTypes().forEach(function (relationType) {
            this.relationsByType[relationType].forEach(function (relation) {
                var edge = g.addEdge(relation.from.id.toString(), relation.to.id.toString());
            }, this);
        }, this);
        console.log(g.to_dot());
        g.output('png', 'graph.png');
    }
};
