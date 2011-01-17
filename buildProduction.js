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
                return relation.type !== 'JavaScriptStaticInclude';
            }, group());
        });
        fileUtils.mkpath(path.join(options.outRoot, options.staticUrl), this.parallel());
    },
    error.logAndExit(function () {
        transforms.bundleRelations(siteGraph, siteGraph.relations.filter(function (relation) {
            return relation.from === htmlAssets[0] && relation.type === 'HTMLScript';
        }), this.parallel());
        transforms.bundleRelations(siteGraph, siteGraph.relations.filter(function (relation) {
            return relation.from === htmlAssets[0] && relation.type === 'HTMLStyle';
        }), this.parallel());
    }),
    error.logAndExit(function () {
        transforms.dumpGraph(siteGraph.lookupSubgraph(htmlAssets[0], function (relation) {
            return relation.type === 'HTMLStyle' || relation.type === 'CSSBackgroundImage';
        }), "png", "beforesprite.png", this);
    }),
    error.logAndExit(function () {
        transforms.spriteBackgroundImages(siteGraph, this);
    }),
    error.logAndExit(function () {
        transforms.checkRelationConsistency(siteGraph, this);
    }),
    error.logAndExit(function () {
        transforms.dumpGraph(siteGraph.lookupSubgraph(htmlAssets[0], function (relation) {
            return relation.type === 'HTMLStyle' || relation.type === 'CSSBackgroundImage';
        }), "png", "aftersprite.png", this);
    }),
    error.logAndExit(function () {
        // FIXME
        siteGraph.assets.forEach(function (asset) {
            if (htmlAssets.indexOf(asset) === -1) {
                siteGraph.setAssetUrl(asset, path.join(options.staticUrl, "foo"));
            }
        });
        process.nextTick(this);
    }),
    error.logAndExit(function () {
        transforms.findAssetSerializationOrder(siteGraph, this);
    }),
    error.logAndExit(function (assetSerializationOrderGroups) {
        function serializeAssets(assets, cb) {
            step(
                function () {
                    var group = this.group();
                    assets.forEach(function (asset) {
                        // Move + write only if asset has non-inline incoming relations
                        if (htmlAssets.indexOf(asset) !== -1 || siteGraph.findRelations('to', asset).some(function (relation) {return !relation.isInline;})) {
                            var callback = group();
                            asset.serialize(error.passToFunction(callback, function (src) {
                                if (htmlAssets.indexOf(asset) === -1) {
                                    var md5Prefix = require('crypto').createHash('md5').update(src).digest('hex').substr(0, 10);
                                    siteGraph.setAssetUrl(asset, path.join(options.staticUrl, md5Prefix + '.' + asset.defaultExtension));
                                }
                                fs.writeFile(path.join(options.outRoot, asset.url), src, asset.encoding, callback);
                            }));
                        }
                    }, this);
                    process.nextTick(group());
                },
                cb
            );
        }
        var callback = this;
        function proceed() {
            if (assetSerializationOrderGroups.length) {
                serializeAssets(assetSerializationOrderGroups.shift(), proceed);
            } else {
                callback();
            }
        }
        proceed();
   })
);
