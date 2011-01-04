/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    assets = require('./assets'),
    error = require('./error');

var SiteGraph = module.exports = function (config) {
    _.extend(this, config || {});
    this.assetsByUrl = {};
    this.assetsByType = {};
    this.relationsByType = {};
};

SiteGraph.prototype = {
    addAsset: function (asset) {
        if ('url' in asset) {
            this.assetsByUrl[asset.url] = asset;
        }
        if (!(asset.type in this.assetsByType)) {
            this.assetsByType[asset.type] = [];
        }
        this.assetsByType[asset.type].push(asset);
    },

    addRelation: function (relation, srcAsset, targetAsset) {
        if (!(relation.type in this.relationsByType)) {
            this.relationsByType[relation.type] = [];
        }
        this.relationsByType[relation.type].push(relation);
    }
};
