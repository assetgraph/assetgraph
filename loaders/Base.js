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
        if ('url' in assetConfig) {
            var lookupUrl = this.siteGraph.lookupIndex('asset', 'url', assetConfig.url);
            if (lookupUrl.length) {
                return lookupUrl[0];
            }
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
        (function traverse(asset, cb) {
            if ('url' in asset) {
                if (seenAssetUrls[asset.url]) {
                    return cb();
                }
                seenAssetUrls[asset.url] = true;
            }
            var filteredOriginalRelations;
            step(
                function () {
                    asset.getOriginalRelations(this);
                },
                error.passToFunction(cb, function (originalRelations) {
                    filteredOriginalRelations = originalRelations.filter(includeRelationLambda);
                    if (filteredOriginalRelations.length) {
                        var group = this.group();
                        filteredOriginalRelations.forEach(function (relation) {
                            that.resolveAssetConfig(relation.assetConfig, relation.from.baseUrl, group());
                        }, this);
                    } else {
                        return cb();
                    }
                }),
                error.passToFunction(cb, function (resolvedAssetConfigArrays) {
                    var numAssets = 0,
                        makeParallel = this.parallel;
                    function initializeRelation(relation) {
                        if (!('url' in relation.assetConfig)) {
                            // Inline asset, copy baseUrl from asset
                            relation.assetConfig.baseUrl = asset.baseUrl;
                        }
                        relation.to = that.loadAsset(relation.assetConfig);
                        numAssets++;
                        traverse(relation.to, makeParallel());
                        that.siteGraph.registerRelation(relation);
                    }
                    resolvedAssetConfigArrays.forEach(function (resolvedAssetConfigs, i) {
                        var originalRelation = filteredOriginalRelations[i];
                        if (resolvedAssetConfigs.length === 0) {
                            asset.detachRelation(originalRelation);
                        } else if (resolvedAssetConfigs.length === 1) {
                            originalRelation.assetConfig = resolvedAssetConfigs[0];
                            initializeRelation(originalRelation);
                        } else if (asset.attachRelation) {
                            var previous = originalRelation;
                            resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                                var relation = new originalRelation.constructor({
                                    assetConfig: resolvedAssetConfig
                                });
                                asset.attachRelation(relation, 'after', previous);
                                initializeRelation(relation);
                                previous = relation;
                            });
                            asset.detachRelation(originalRelation);
                        } else {
                            cb(new Error("assetConfig resolved to multiple, and " + originalRelation.type + " doesn't support attachRelation"));
                        }
                    }, this);
                    if (!numAssets) {
                        process.nextTick(this);
                    }
                }),
                cb
            );
        })(originAsset, cb);
    }
};
