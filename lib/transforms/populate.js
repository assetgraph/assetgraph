var _ = require('underscore'),
    step = require('step'),
    fileUtils = require('../fileUtils'),
    error = require('../error'),
    assets = require('../assets');

exports.populate = function (includeRelationLambda) {
    return function populate(assetGraph, cb) {
        function traverse(asset, fromUrl, cb) {
            var filteredOriginalRelations;
            step(
                function () {
                    asset.getOriginalRelations(this);
                },
                error.passToFunction(cb, function (originalRelations) {
                    filteredOriginalRelations = includeRelationLambda ? originalRelations.filter(includeRelationLambda) : originalRelations;
                    if (filteredOriginalRelations.length) {
                        var group = this.group();
                        filteredOriginalRelations.forEach(function (relation) {
                            assetGraph.resolveAssetConfig(relation.assetConfig, asset.url || fromUrl, group());
                        }, this);
                    } else {
                        return cb();
                    }
                }),
                error.passToFunction(cb, function (resolvedAssetConfigArrays) {
                    var lastSeenRelation,
                        relationsPointingAtNewAssets = [];
                    function initializeAndAddRelation(relation) {
                        if (relation.assetConfig.url && relation.assetConfig.url in assetGraph.assetsByUrl) {
                            relation.to = assetGraph.assetsByUrl[relation.assetConfig.url];
                        } else {
                            relation.to = assets.create(relation.assetConfig);
                            assetGraph.addAsset(relation.to);
                            relationsPointingAtNewAssets.push(relation);
                        }
                        if (lastSeenRelation) {
                            assetGraph.addRelation(relation, 'after', lastSeenRelation);
                        } else {
                            assetGraph.addRelation(relation, 'first');
                        }
                        lastSeenRelation = relation;
                    }
                    resolvedAssetConfigArrays.forEach(function (resolvedAssetConfigs, i) {
                        if (!_.isArray(resolvedAssetConfigs)) {
                            // Simple assetGraph.resolveAssetConfig case
                            resolvedAssetConfigs = [resolvedAssetConfigs];
                        }
                        var originalRelation = filteredOriginalRelations[i];
                        if (resolvedAssetConfigs.length === 0) {
                            asset.detachRelation(originalRelation);
                        } else if (resolvedAssetConfigs.length === 1) {
                            originalRelation.assetConfig = resolvedAssetConfigs[0];
                            initializeAndAddRelation(originalRelation);
                        } else if (asset.attachRelation) {
                            resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                                var relation = new originalRelation.constructor({
                                    from: asset,
                                    assetConfig: resolvedAssetConfig
                                });
                                relation.from.attachRelation(relation, 'before', originalRelation);
                                initializeAndAddRelation(relation);
                            });
                            asset.detachRelation(originalRelation);
                        } else {
                            cb(new Error("assetConfig resolved to multiple, but " + originalRelation.type + " doesn't support attachRelation"));
                        }
                    }, this);
                    if (relationsPointingAtNewAssets.length) {
                        relationsPointingAtNewAssets.forEach(function (relation) {
                            traverse(relation.to, relation.from.url || fromUrl, this.parallel());
                        }, this);
                    } else {
                        process.nextTick(this);
                    }
                }),
                cb
            );
        }

        step(
            function () {
                assetGraph.findAssets('isInitial', true).forEach(function (asset) {
                    traverse(asset, assetGraph.root, this.parallel());
                }, this);
                process.nextTick(this.parallel());
            },
            cb
        );
    };
};
