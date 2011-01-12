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
    this.assetsByUrl = {};
    this.assetsByType = {};
    this.relationsByType = {};
};

SiteGraph.prototype = {
    registerAsset: function (asset) {
        asset.id = this.nextAssetId;
        this.nextAssetId += 1;
        this.assets.push(asset);
        if ('url' in asset) {
            this.assetsByUrl[asset.url] = asset;
        }
        if (!(asset.type in this.assetsByType)) {
            this.assetsByType[asset.type] = [];
        }
        this.assetsByType[asset.type].push(asset);
    },

    registerRelation: function (relation) {
        relation.id = this.nextRelationId;
        this.nextRelationId += 1;
        this.relations.push(relation);
        if (!(relation.type in this.relationsByType)) {
            this.relationsByType[relation.type] = [];
        }
        this.relationsByType[relation.type].push(relation);
    },

    getRelationsByType: function (type) {
        return this.relationsByType[type] || [];
    },

    getAssetsByType: function (type) {
        return this.assetsByType[type] || [];
    },

    getRelationTypes: function () {
        return _.keys(this.relationsByType);
    },

    getAssetTypes: function () {
        return _.keys(this.assetsByType);
    },

    // This cries out for a rich query facility/DSL!
    getRelationsDeep: function (startAsset, lambda) { // preorder
        var result = [],
            seenAssets = {},
            seenRelations = {};
        function traverse (asset) {
            if (asset.id in seenAssets) {
                return;
            } else {
                seenAssets[asset.id] = true;
                asset.relations.forEach(function (relation) {
                    if (lambda(relation)) {
                        traverse(relation.to);
                        if (!(relation.id in seenRelations)) {
                            result.push(relation);
                            seenRelations[relation.id] = true;
                        }
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
