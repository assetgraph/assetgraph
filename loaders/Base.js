/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    assets = require('../assets'),
    error = require('../error');

// Expects: config.root
var Base = module.exports = function (config) {
    _.extend(this, config);
    this.seenAssetUrls = {};
};

Base.prototype = {
    loadAsset: function (assetConfig) {
        var This = this;
        if ('url' in assetConfig && assetConfig.url in this.siteGraph.assetsByUrl) {
            // Already loaded
            return this.siteGraph.assetsByUrl[assetConfig.url];
        }
        if (!('baseUrl' in assetConfig)) {
            if ('url' in assetConfig) {
                assetConfig.baseUrl = path.dirname(assetConfig.url);
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
        var Constructor = assets.byType[assetConfig.type];
        if (!('src' in assetConfig)) {
            assetConfig.srcProxy = this.getSrcProxy(assetConfig, Constructor.prototype.encoding);
        }
        return new Constructor(assetConfig);
    },

    populatePointerType: function (srcAsset, pointerType, cb) {
        var This = this,
            allRelations = [],
            pointers;

        step(
            function () {
                srcAsset.getPointersOfType(pointerType, this);
            },
            error.passToFunction(cb, function (pointersOfType) {
                pointers = pointersOfType; // Make available in the next step
                if (pointers.length) {
                    pointers.forEach(function (pointer) {
                        var assetConfig = pointer.assetConfig;
                        This.resolveAssetConfig(pointer.assetConfig, pointer.asset.baseUrl, this.parallel());
                        delete pointer.assetConfig;
                    }, this);
                } else {
                    process.nextTick(function () {
                        cb(null, []);
                    });
                }
            }),
            error.passToFunction(cb, function () { // [resolvedAssetConfigArrayForPointer1, ...]
                var assets = [],
                    group = this.group();
                _.toArray(arguments).forEach(function (resolvedAssetConfigs, i) {
                    resolvedAssetConfigs.forEach(function (assetConfig) {
                        if (!('url' in assetConfig)) {
                            // Inline asset, copy baseUrl from srcAsset
                            assetConfig.baseUrl = srcAsset.baseUrl;
                        }
                        var pointer = pointers[i],
                            relation = {
                                type: pointer.type,
                                srcAsset: srcAsset,
                                targetAsset: This.loadAsset(assetConfig),
                                pointer: pointer
                            };
                        This.siteGraph.addRelation(relation);
                        assets.push(relation.targetAsset);
                    });
                }, this);
                cb(null, assets);
            })
        );
    },

    populate: function (asset, pointerTypes, cb) {
        var This = this;
        if (asset.url) {
            if (this.seenAssetUrls[asset.url]) {
                return cb();
            } else {
                this.seenAssetUrls[asset.url] = true;
            }
        }
        step(
            function () {
                pointerTypes.forEach(function (pointerType) {
                    This.populatePointerType(asset, pointerType, this.parallel());
                }, this);
            },
            error.passToFunction(cb, function () { // [[loaded assets for pointerTypes[0]], ...]
                var loadedAssets = _.flatten(_.toArray(arguments));
                if (loadedAssets.length) {
                    var group = this.group();
                    loadedAssets.forEach(function (loadedAsset) {
                        This.populate(loadedAsset, pointerTypes, group());
                    });
                } else {
                    return cb(null, []);
                }
            }),
            cb
        );
    }
};
