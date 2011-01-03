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
        if (pointer.inlineData) {
            process.nextTick(function () {
                return cb(null, [
                    {
                        pointer: pointer,
                        inlineData: pointer.inlineData
                    }
                ]);
            });
        } else if (pointer.url) {
            var This = this,
                matchLabel = pointer.url.match(/^([\w\-]+):(.*)$/);
            if (matchLabel) {
                pointer.label = matchLabel[1];
                if (!('originalUrl' in pointer)) {
                    pointer.originalUrl = pointer.url;
                }
                pointer.url = matchLabel[2];
                var resolver = This.labelResolvers[pointer.label] || This.defaultLabelResolver;

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
                    url: path.join(pointer.baseUrl, pointer.url)
                }]);
            }
        } else {
            // No url and no inlineData, give up.
            cb(new Error("Cannot resolve pointer"));
        }
    },

    createAsset: function (relation) {
        if ('url' in relation) {
            var alreadyLoaded = this.siteGraph.assetsByUrl[relation.url];
            if (alreadyLoaded) {
                return alreadyLoaded;
            }
        }
        var This = this,
            type = determineRelationTargetType(relation),
            Constructor = assets.byType[type],
            assetConfig = {};

        if ('inlineData' in relation) {
            assetConfig.srcProxy = function (cb) {
                process.nextTick(function () {
                    cb(null, relation.inlineData);
                });
            };
            assetConfig.baseUrl = relation.srcAsset.baseUrl;
        } else if ('url' in relation) {
            assetConfig.url = relation.url;
            assetConfig.baseUrl = path.dirname(relation.url);
            assetConfig.srcProxy = function (cb) {
                fs.readFile(path.join(This.root, relation.url), Constructor.prototype.encoding, cb);
            };
        } else {
            throw new Error("createAsset cannot make sense of relation: " + util.inspect(relation));
        }
        if ('assetPointers' in relation) { // Premature optimization?
            assetConfig.pointers = relation.assetPointers;
        }
        return new Constructor(assetConfig);
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
                        relation.targetAsset = This.createAsset(relation);
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
