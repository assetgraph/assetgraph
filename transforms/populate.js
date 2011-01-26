var _ = require('underscore'),
    step = require('step'),
    fileUtils = require('../fileUtils'),
    error = require('../error');

function resolveAssetConfigWithCustomProtocols(siteGraph, assetConfig, fromUrl, cb) {
    assetConfig = siteGraph.resolveAssetConfig(assetConfig, fromUrl);
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
    if (labelName in siteGraph.customProtocols) {
        siteGraph.customProtocols[labelName].resolve(labelRelativePath, error.passToFunction(cb, function (resolvedAssetConfigs) {
            if (!_.isArray(resolvedAssetConfigs)) {
                resolvedAssetConfigs = [resolvedAssetConfigs];
            }
            if (resolvedAssetConfigs.length === 0) {
                return cb(null, []); // I have yet to see a use case for this, but...
            }
            step(
                function () {
                    resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                        resolveAssetConfigWithCustomProtocols(siteGraph, resolvedAssetConfig, fromUrl, this.parallel());
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

var populatedAssets = {}; // FIXME: One more jab at using SiteGraph's indices?

function populateFromAsset(siteGraph, originAsset, includeRelationLambda, cb) {
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
                        resolveAssetConfigWithCustomProtocols(siteGraph, relation.assetConfig, asset.url || fromUrl, group());
                    }, this);
                } else {
                    return cb();
                }
            }),
            error.passToFunction(cb, function (resolvedAssetConfigArrays) {
                var initializedRelations = [];
                function initializeAndRegisterRelation(relation) {
                    relation.to = siteGraph.registerAsset(relation.assetConfig);
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
}

exports.populate = function (options) {
    return function (siteGraph, cb) {
        if ('initial' in options && !_.isArray(options.initial)) {
            options.initial = [options.initial];
        }
        var initialAssets = options.initial.map(function (asset) {
            if (asset.isAsset) {
                return asset;
            } else {
                return siteGraph.registerAsset(initialAssetConfig, true);
            }
        });

        step(
            function () {
                initialAssets.forEach(function (templateUrl) {
                    populateFromAsset(siteGraph, template, options.includeRelationsLambda, this.parallel());
                }, this);
            },
            cb
        );
    };
};
