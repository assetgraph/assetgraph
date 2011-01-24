var _ = require('underscore'),
    step = require('step'),
    error = require('../error');

exports.populate = function populate(siteGraph, originAsset, includeRelationLambda, cb) {
    var populatedAssets = {};
    (function traverse(asset, fromUrl, cb) {
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
                        siteGraph.resolveAssetConfig(relation.assetConfig, asset.url || fromUrl, group());
                    }, this);
                } else {
                    return cb();
                }
            }),
            error.passToFunction(cb, function (resolvedAssetConfigArrays) {
                var initializedRelations = [];
                function initializeAndRegisterRelation(relation) {
                    if (relation.isInline) {
                        relation.assetConfig.baseUrl = asset.baseUrl;
                    }
                    relation.to = siteGraph.loadResolvedAssetConfig(relation.assetConfig);
                    if (initializedRelations.length) {
                        siteGraph.registerRelation(relation, 'after', initializedRelations[initializedRelations.length - 1]);
                    } else {
                        siteGraph.registerRelation(relation, 'first');
                    }
                    initializedRelations.push(relation);
                }
                resolvedAssetConfigArrays.forEach(function (resolvedAssetConfigs, i) {
                    if (!_.isArray(resolvedAssetConfigs)) {
                        // Simple siteGraph.resolveAssetConfig case
                        resolvedAssetConfigs = [resolvedAssetConfigs];
                    }
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
                        traverse(relation.to, relation.from.url || fromUrl, this.parallel());
                    }, this);
                } else {
                    process.nextTick(this);
                }
            }),
            cb
        );
    })(originAsset, originAsset.url, function (err) {
        cb(err, siteGraph);
    });
};
