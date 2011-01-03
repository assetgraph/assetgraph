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

process.on('uncaughtException', function (e) {
    console.log("Uncaught exception: " + sys.inspect(e.msg) + "\n" + e.stack);
});

// Expects: config.root
var FsLoader = module.exports = function (config) {
    _.extend(this, config);
    this.labelResolvers = {};
    this.seenAssetUrls = {};
    this.defaultLabelResolver = new resolvers.FindParentDirectory({root: this.root});
};

function determineRelationTargetType(relation) {
    if ('type' in relation) {
        return relation.type;
    }
    if ('url' in relation) {
        var assetType = assets.typeByExtension[path.extname(relation.url)];
        if (assetType) {
            return assetType;
        }
    }
    // Inline assets:
    if (relation.pointer) {
        switch (relation.pointer.type) {
        case 'html-script-tag':
            return 'JavaScript';
        case 'html-style-tag':
            return 'CSS';
        case 'css-background-image':
            return 'Image';
        }
    }
    // FIXME: Extract mime type from data: urls
    throw new Error("Cannot determine asset from relation: " + require('sys').inspect(relation));
}

FsLoader.prototype = {
    addLabelResolver: function (labelName, Constructor, config) {
        config = config || {};
        config.root = this.root;
        this.labelResolvers[labelName] = new Constructor(config);
    },

    // cb(err, relationsArray)
    resolvePointer: function (pointer, cb) {
        var assetConfig = pointer.assetConfig;
        if (pointer.assetConfig.src) {
            process.nextTick(function () {
                return cb(null, [
                    {
                        pointer: pointer,
                        assetConfig: assetConfig
                    }
                ]);
            });
        } else if (assetConfig.url) {
            var This = this,
                matchLabel = url.match(/^([\w\-]+):(.*)$/);
            if (matchLabel) {
                assetConfig.label = matchLabel[1];
                if (!('originalUrl' in assetConfig)) {
                    assetConfig.originalUrl = assetConfig.url;
                }
                assetConfig.url = matchLabel[2];
                var resolver = This.labelResolvers[assetConfig.label] || This.defaultLabelResolver;

                resolver.resolve(pointer, error.passToFunction(cb, function (relations) {
                    step(
                        function () {
                            var group = this.group();
                            relations.forEach(function (relation) {
                                if ('label' in relation) {
                                    // Reresolve, probably ext: remapped to ext-base:
                                    This.resolvePointer(resolvedPointer, group());
                                } else {
                                    group()(null, [relation]);
                                }
                            });
                        },
                        error.passToFunction(cb, function (relations) {
                            cb(null, _.flatten(relations));
                        })
                    );
                }));
            } else {
                // No label, assume relative path
                cb(null, [{
                    pointer: pointer,
                    assetConfig: _.extend(assetConfig, {
                        url: path.join(pointer.asset.baseUrl, assetConfig.url)
                    })
                }]);
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
                throw "Couldn't work out baseUrl";
            }
        }
        if (!('type' in assetConfig)) {
            throw "No type in assetConfig";
        }
        var Constructor = assets.byType[assetConfig.type];
        if (!('src' in assetConfig)) {
            assetConfig.srcProxy = function (cb) {
                fs.readFile(path.join(This.root, assetConfig.url), Constructor.prototype.encoding, cb);
            };
        }
        return new Constructor(assetConfig);
    },

    createAssetFromRelation: function (relation) {
        var assetConfig = relation.assetConfig;
        if (!assetConfig) {
            throw new Error("No assetConfig in relation! " + sys.inspect(relation));
        }
        if (!('baseUrl' in assetConfig)) {
            if (relation.srcAsset && relation.srcAsset.url) {
                assetConfig.baseUrl = path.dirname(relation.srcAsset.url);
            } else if (relation.srcAsset && relation.srcAsset.baseUrl) {
                // Inline asset?
                assetConfig.baseUrl = relation.srcAsset.baseUrl;
            } else {
                throw new Error("Cannot determine baseUrl");
            }
        }
        return this.createAsset(assetConfig);
    },

    populatePointerType: function (srcAsset, pointerType, cb) {
        var This = this,
            allRelations = [];
        step(
            function () {
                srcAsset.getPointersOfType(pointerType, this);
            },
            error.throwException(function (pointersOfType) {
                if (pointersOfType.length) {
                    pointersOfType.forEach(function (pointer) {
                        This.resolvePointer(pointer, this.parallel());
                    }, this);
                } else {
                    process.nextTick(function () {
                        cb(null, []);
                    });
                }
            }),
            error.throwException(function () { // [[resolved pointers for pointer 1], ...]
                var assets = [],
                    group = this.group();
                _.toArray(arguments).forEach(function (relations, i) {
                    [].push.apply(allRelations, relations);
                    relations.forEach(function (relation) {
                        relation.srcAsset = srcAsset;
                        relation.targetAsset = This.createAssetFromRelation(relation);
                        assets.push(relation.targetAsset);
                        This.siteGraph.addAsset(relation.targetAsset);
                        This.siteGraph.addRelation(relation);
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
            error.throwException(function () { // [[loaded assets for pointerTypes[0]], ...]
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
