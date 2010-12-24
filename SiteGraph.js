/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    assets = require('./assets'),
    relations = require('./relations'),
    error = require('./error');

var SiteGraph = module.exports = function (config) {
    _.extend(this, config || {});
    this.assetsByUrl = {};
};

SiteGraph.prototype = {
    addAsset: function (asset) {
console.log("addAsset " + asset.url);
        if ('url' in asset) {
            this.assetsByUrl[asset.url] = asset;
        }
    },

    addRelation: function () {}
};
