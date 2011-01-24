var _ = require('underscore'),
    step = require('step'),
    fileUtils = require('../fileUtils'),
    error = require('../error');

function resolveAssetConfigWithCustomProtocols(siteGraph, assetConfig, fromUrl, cb) {
    assetConfig = siteGraph.resolveAssetConfig(assetConfig, fromUrl);
    if ((assetConfig.url && /^(https?|data|file):$/.test(assetConfig.url.protocol)) || 'originalSrc' in assetConfig) {
        // Already resolved
        return process.nextTick(function () {
            cb(null, assetConfig);
        });
    } else if (assetConfig.url.protocol in siteGraph.customProtocols) {
        // Set pathname to the entire href sans "protocol:"
        assetConfig.url.pathname = assetConfig.url.href.substr(assetConfig.url.protocol.length);
        siteGraph.customProtocols[assetConfig.url.protocol].resolve(assetConfig.url, error.passToFunction(cb, function (resolvedAssetConfigs) {
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
    } else if (assetConfig.url.protocol && fromUrl.protocol === 'file:') {
        fileUtils.findParentDirCached(fromUrl, assetConfig.url.protocol.replace(/:$/, ""), error.passToFunction(cb, function (parentPath) {
            var labelRelativePath = assetConfig.url.href.substr(assetConfig.url.protocol.length);
            assetConfig.url = fileUtils.fsPathToFileUrl(parentPath + '/' + labelRelativePath);
            cb(null, assetConfig);
        }));
    } else {
        cb(new Error("Cannot resolve assetConfig"));
    }
};

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
};
