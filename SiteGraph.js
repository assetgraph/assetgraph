/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    graphviz = require('graphviz'),
    error = require('./error');

var SiteGraph = module.exports = function (config) {
    _.extend(this, config || {});
    this.nextAssetId = 1;
    this.nextRelationId = 1;
    this.assetsByUrl = {};
    this.assetsByType = {};
    this.relationsByType = {};
};

SiteGraph.prototype = {
    addAsset: function (asset) {
        asset.id = this.nextAssetId;
        this.nextAssetId += 1;
        if ('url' in asset) {
            this.assetsByUrl[asset.url] = asset;
        }
        if (!(asset.type in this.assetsByType)) {
            this.assetsByType[asset.type] = [];
        }
        this.assetsByType[asset.type].push(asset);
    },

    addRelation: function (relation) {
        relation.id = this.nextRelationId;
        this.nextRelationId += 1;
        if (!(relation.type in this.relationsByType)) {
            this.relationsByType[relation.type] = [];
        }
        this.relationsByType[relation.type].push(relation);
    },

    getRelationTypes: function () {
        return _.keys(this.relationsByType);
    },

    getAssetTypes: function () {
        return _.keys(this.assetsByType);
    },

    toGraphViz: function () {
        var g = graphviz.digraph("G");
g.set('splines', 'compound');
        this.getAssetTypes().forEach(function (assetType) {
            this.assetsByType[assetType].forEach(function (asset) {
                g.addNode(asset.id.toString(), {label: 'url' in asset ? path.basename(asset.url) : 'inline'});
            }, this);
        }, this);
        this.getRelationTypes().forEach(function (relationType) {
            this.relationsByType[relationType].forEach(function (relation) {
                var edge = g.addEdge(relation.srcAsset.id.toString(), relation.targetAsset.id.toString());
            }, this);
        }, this);
        console.log(g.to_dot());
        g.output('png', 'graph.png');
    }
};
