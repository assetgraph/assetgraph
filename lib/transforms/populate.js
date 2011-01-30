var _ = require('underscore'),
    step = require('step'),
    fileUtils = require('../fileUtils'),
    error = require('../error');

function resolveAssetConfigWithCustomProtocols(assetGraph, assetConfig, fromUrl, cb) {
    assetConfig = assetGraph.resolveAssetConfig(assetConfig, fromUrl);
    if ((assetConfig.url && /^(file|https?):/.test(assetConfig.url)) || 'originalSrc' in assetConfig) {
        // Already resolved
        return process.nextTick(function () {
            cb(null, assetConfig);
        });
    }
    var splitIntoLabelAndPath = assetConfig.url.match(/^([^:]+):(.*)$/);
    if (!splitIntoLabelAndPath) {
        cb(new Error("Cannot resolve assetConfig"));
    }

    var labelName = splitIntoLabelAndPath[1],
        labelRelativePath = splitIntoLabelAndPath[2];
    if (labelName in assetGraph.customProtocols) {
        assetGraph.customProtocols[labelName].resolve(labelRelativePath, error.passToFunction(cb, function (resolvedAssetConfigs) {
            if (!_.isArray(resolvedAssetConfigs)) {
                resolvedAssetConfigs = [resolvedAssetConfigs];
            }
            if (resolvedAssetConfigs.length === 0) {
                return cb(null, []); // I have yet to see a use case for this, but...
            }
            step(
                function () {
                    resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                        resolveAssetConfigWithCustomProtocols(assetGraph, resolvedAssetConfig, fromUrl, this.parallel());
                    }, this);
                },
                error.passToFunction(cb, function () { // ...
                    var flattened = [];
                    _.toArray(arguments).forEach(function (reresolvedAssetConfig) {
                        if (_.isArray(reresolvedAssetConfig)) {
                            Array.prototype.push.apply(flattened, reresolvedAssetConfig);
                        } else {
                            flattened.push(reresolvedAssetConfig);
                        }
                    });
                    if (flattened.length === 1) {
                        return cb(null, flattened[0]);
                    } else {
                        return cb(null, flattened);
                    }
                })
            );
        }));
    } else if (/^file:/.test(fromUrl)) {
        fileUtils.findParentDirCached(fileUtils.fileUrlToFsPath(fromUrl), labelName, error.passToFunction(cb, function (parentPath) {
            assetConfig.url = fileUtils.fsPathToFileUrl(parentPath + '/' + labelRelativePath);
            return cb(null, assetConfig);
        }));
    } else {
        cb(new Error("Cannot resolve assetConfig"));
    }
}

exports.populate = function (includeRelationLambda) {
    var assetsSeenDuringPopulation = {};

    return function populate(assetGraph, cb) {

        function traverse(asset, fromUrl, cb) {
            if (asset.id in assetsSeenDuringPopulation) {
                return cb();
            }
            assetsSeenDuringPopulation[asset.id] = true;
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
                            resolveAssetConfigWithCustomProtocols(assetGraph, relation.assetConfig, asset.url || fromUrl, group());
                        }, this);
                    } else {
                        return cb();
                    }
                }),
                error.passToFunction(cb, function (resolvedAssetConfigArrays) {
                    var initializedRelations = [];
                    function initializeAndRegisterRelation(relation) {
                        relation.to = assetGraph.registerAsset(relation.assetConfig);
                        if (initializedRelations.length) {
                            assetGraph.registerRelation(relation, 'after', initializedRelations[initializedRelations.length - 1]);
                        } else {
                            assetGraph.registerRelation(relation, 'first');
                        }
                        initializedRelations.push(relation);
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
                            cb(new Error("assetConfig resolved to multiple, but " + originalRelation.type + " doesn't support attachRelation"));
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
