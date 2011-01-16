#!/usr/bin/env node

var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    assets = require('./assets'),
    relations = require('./relations'),
    transforms = require('./transforms'),
    SiteGraph = require('./SiteGraph'),
    FsLoader = require('./loaders/Fs'),
    error = require('./error'),
    options = {};

_.each(require('optimist').usage('FIXME').demand(['root', 'out-root', 'static-url']).argv,
    function (value, optionName) {
        options[optionName.replace(/-([a-z])/g, function ($0, $1) {
            return $1.toUpperCase();
        })] = value;
    }
);

var siteGraph = new SiteGraph(),
    loader = new FsLoader({
        siteGraph: siteGraph,
        root: options.root
    }),
    htmlAssets = [];

step(
    function () {
        var group = this.group();
        options._.forEach(function (htmlUrl) {
            var htmlAsset = loader.loadAsset({type: 'HTML', url: htmlUrl});
            htmlAssets.push(htmlAsset);
            loader.populate(htmlAsset, function (relation) {
                return relation.type !== 'JavaScriptStaticInclude' && relation.type !== 'HTMLScript';
            }, group());
        });
        fileUtils.mkpath(path.join(options.outRoot, options.staticUrl), this.parallel());
    },
    error.logAndExit(function () {
        transforms.checkRelationConsistency(siteGraph, this);
    }),
    error.logAndExit(function () {
        transforms.findAssetSerializationOrder(siteGraph, this);
    }),
    error.logAndExit(function (assetSerializationOrder) {
        var group = this.group();
        assetSerializationOrder.forEach(function (asset) {
            var callback = group();
            asset.serialize(error.passToFunction(callback, function (src) {
                if (htmlAssets.indexOf(asset) === -1) {
                    var md5Prefix = require('crypto').createHash('md5').update(src).digest('hex').substr(0, 10);
                    siteGraph.setAssetUrl(asset, path.join(options.staticUrl, md5Prefix + '.' + asset.defaultExtension));
                }
                fs.writeFile(path.join(options.outRoot, asset.url), src, asset.encoding, callback);
            }));
        }, this);
        process.nextTick(group());
    })
);
