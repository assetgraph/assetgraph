/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    resolvers = require('./resolvers'),
    assets = require('./assets'),
    error = require('./error');

// Expects: config.root
var FsLoader = module.exports = function (config) {
    _.extend(this, config);
    this.labelResolvers = {};
    this.seenAssetUrls = {};
    this.defaultLabelResolver = new resolvers.FindParentDirectory({root: this.root});
};

FsLoader.prototype = {
    addLabelResolver: function (labelName, Constructor, config) {
        config = config || {};
        config.root = this.root;
        this.labelResolvers[labelName] = new Constructor(config);
    },

    // cb(err, relationsArray)
    resolveAssetConfig: function (assetConfig, pointer, cb) {
console.log("resolving assetConfig " + require('sys').inspect(assetConfig));
        if (assetConfig.src) {
            process.nextTick(function () {
                return cb(null, [assetConfig]);
            });
        } else if (assetConfig.url) {
            var This = this,
                matchLabel = assetConfig.url.match(/^([\w\-]+):(.*)$/);
            if (matchLabel) {
                var label = matchLabel[1];
                if (!('originalUrl' in assetConfig)) {
                    assetConfig.originalUrl = assetConfig.url;
                }
                assetConfig.url = matchLabel[2];
                var resolver = This.labelResolvers[label] || This.defaultLabelResolver;

                resolver.resolve(assetConfig, label, pointer, error.passToFunction(cb, function (resolvedAssetConfigs) {
                    step(
                        function () {
                            var group = this.group();
                            resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                                if ('url' in resolvedAssetConfig && /[\w\-]+:/.test(resolvedAssetConfig.url)) {
                                    // Reresolve, probably ext: remapped to ext-base:
                                    This.resolveAssetConfig(resolvedAssetConfig, pointer, group());
                                } else {
                                    group()(null, [resolvedAssetConfig]);
                                }
                            });
                        },
                        error.passToFunction(cb, function (resolvedAssetConfigArrays) {
                            cb(null, _.flatten(resolvedAssetConfigArrays));
                        })
                    );
                }));
            } else {
                // No label, assume relative path
                assetConfig.url = path.join(pointer.asset.baseUrl, assetConfig.url);
                cb(null, [assetConfig]);
            }
        } else {
            // No url and no inlineData, give up.
            cb(new Error("Cannot resolve pointer"));
        }
    },

    createAsset: function (assetConfig) {
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
            var extension = 'url' in assetConfig && path.extname(assetConfig.url);
            if (extension && extension in assets.typeByExtension) {
                assetConfig.type = assets.typeByExtension[extension];
            } else {
                // FIXME: Extract mime type from data: urls
                throw new Error("No type in assetConfig and couldn't work it out from the url: " + sys.inspect(assetConfig));
            }
        }
        var Constructor = assets.byType[assetConfig.type];
        if (!('src' in assetConfig)) {
            assetConfig.srcProxy = function (cb) {
                fs.readFile(path.join(This.root, assetConfig.url), Constructor.prototype.encoding, cb);
            };
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
                        This.resolveAssetConfig(pointer.assetConfig, pointer, this.parallel());
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
                        var relation = {
                            srcAsset: srcAsset,
                            targetAsset: This.createAsset(assetConfig),
                            pointer: pointers[i]
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
