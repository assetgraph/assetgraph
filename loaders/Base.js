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
};

Base.prototype = {
    loadAsset: function (assetConfig) {
        if ('url' in assetConfig && assetConfig.url in this.siteGraph.assetsByUrl) {
            // Already loaded
            return this.siteGraph.assetsByUrl[assetConfig.url];
        }
        if (!('baseUrl' in assetConfig)) {
            if ('url' in assetConfig || 'originalUrl' in assetConfig) {
                assetConfig.baseUrl = path.dirname(assetConfig.url || assetConfig.originalUrl);
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
        var asset = new Constructor(assetConfig);
        this.siteGraph.registerAsset(asset);
        return asset;
    },

    populate: function (originAsset, includeRelationLambda, cb) {
        var that = this,
            seenAssetUrls = {};

        function traverse(asset, cb) {
            var filteredOriginalRelations;
            if ('url' in asset) {
                if (seenAssetUrls[asset.url]) {
                    return cb();
                } else {
                   seenAssetUrls[asset.url] = true;
                }
            }
            step(
                function () {
                    asset.getOriginalRelations(this);
                },
                error.passToFunction(cb, function (originalRelations) {
                    filteredOriginalRelations = originalRelations.filter(includeRelationLambda);
                    if (filteredOriginalRelations.length) {
                        filteredOriginalRelations.forEach(function (relation) {
                            that.resolveAssetConfig(relation.assetConfig, relation.from.baseUrl, this.parallel());
                        }, this);
                    } else {
                        return cb();
                    }
                }),
                error.passToFunction(cb, function () { // [resolvedAssetConfigArrayForFirstRelation, ...]
                    var assets = [];
                    _.toArray(arguments).forEach(function (resolvedAssetConfigs, i) {
                        var originalRelation = filteredOriginalRelations[i];
                        if (resolvedAssetConfigs.length === 0) {
                            originalRelation.remove();
                        } else if (resolvedAssetConfigs.length === 1) {
                            if (!('url' in resolvedAssetConfigs[0])) {
                                // Inline asset, copy baseUrl from asset
                                resolvedAssetConfigs[0].baseUrl = originalRelation.from.baseUrl;
                            }
                            originalRelation.assetConfig = resolvedAssetConfigs[0];
                            originalRelation.to = that.loadAsset(originalRelation.assetConfig);
                            that.siteGraph.registerRelation(originalRelation);
                            assets.push(originalRelation.to);
                        } else if (asset.attachRelationAfter) {
                            var previous = originalRelation;
                            resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                                var relation = new originalRelation.constructor({
                                    assetConfig: resolvedAssetConfig
                                });
                                asset.attachRelationAfter(previous, relation);
                                relation.to = that.loadAsset(relation.assetConfig);
                                that.siteGraph.registerRelation(relation);
                                assets.push(relation.to);
                            });
                            originalRelation.remove();
                        } else {
                            cb(new Error("assetConfig resolved to multiple, and " + originalRelation.type + " doesn't support attachRelationAfter"));
                        }
                    }, this);
                    if (assets.length) {
                        var group = this.group();
                        assets.forEach(function (asset) {
                            traverse(asset, group());
                        });
                    } else {
                        process.nextTick(this);
                    }
                }),
                cb
            );
        }
        traverse(originAsset, cb);
    }
};
