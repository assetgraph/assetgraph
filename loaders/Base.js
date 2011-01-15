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
        if (!('originalSrc' in assetConfig)) {
            assetConfig.originalSrcProxy = this.getOriginalSrcProxy(assetConfig, Constructor.prototype.encoding);
        }
        var asset = new Constructor(assetConfig);
        this.siteGraph.registerAsset(asset);
        return asset;
    },

    populate: function (originAsset, includeRelationLambda, cb) {
        var that = this,
            populatedAssets = {};
        (function traverse(asset, cb) {
            if (asset.id in populatedAssets) {
                return cb();
            }
            populatedAssets[asset.id] = true;
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
                    var initializedRelations = [];
                    function initializeAndRegisterRelation(relation) {
                        if (!('url' in relation.assetConfig)) {
                            // Inline asset, copy baseUrl from asset
                            relation.assetConfig.baseUrl = asset.baseUrl;
                        }
                        relation.to = that.loadAsset(relation.assetConfig);
                        if (initializedRelations.length) {
                            that.siteGraph.registerRelation(relation, 'after', initializedRelations[initializedRelations.length - 1]);
                        } else {
                            that.siteGraph.registerRelation(relation, 'first');
                        }
                        initializedRelations.push(relation);
                    }
                    resolvedAssetConfigArrays.forEach(function (resolvedAssetConfigs, i) {
                        var originalRelation = filteredOriginalRelations[i];
                        if (resolvedAssetConfigs.length === 0) {
                            asset.detachRelation(originalRelation);
                        } else if (resolvedAssetConfigs.length === 1) {
                            originalRelation.assetConfig = resolvedAssetConfigs[0];
                            initializeAndRegisterRelation(originalRelation);
                        } else if (asset.attachRelation) {
                            resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                                var relation = new originalRelation.constructor({
                                    from: asset,
                                    assetConfig: resolvedAssetConfig
                                });
                                relation.from.attachRelation(relation, 'before', originalRelation);
                                initializeAndRegisterRelation(relation);
                            });
                            asset.detachRelation(originalRelation);
                        } else {
                            cb(new Error("assetConfig resolved to multiple, and " + originalRelation.type + " doesn't support attachRelation"));
                        }
                    }, this);
                    if (initializedRelations.length) {
                        initializedRelations.forEach(function (relation) {
                            traverse(relation.to, this.parallel());
                        }, this);
                    } else {
                        process.nextTick(this);
                    }
                }),
                cb
            );
        })(originAsset, cb);
    }
};
