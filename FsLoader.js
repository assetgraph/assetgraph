/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    resolvers = require('./resolvers'),
    assets = require('./assets'),
    relations = require('./relations'),
    error = require('./error');

// Expects: config.root
var FsLoader = module.exports = function (config) {
    _.extend(this, config);
    this.assetsBeingLoaded = {}; // url => array of waiting callbacks
    this.labelResolvers = {};
    this.assetLoadingQueues = {};
    this.populatedAssets = {};
    this.nextId = 1;
    this.defaultLabelResolver = new resolvers.FindParentDirectory({root: this.root});
};

function determineAssetType(relation) {
    if ('url' in relation) {
        var assetType = assets.typeByExtension[path.extname(relation.url)];
        if (assetType) {
            return assetType;
        }
    }
    // Inline assets:
    switch (relation.type) {
    case 'html-script-tag':
    case 'js': // FIXME
        return 'JavaScript';
    case 'html-style-tag':
    case 'css': // FIXME
        return 'CSS';
    case 'css-background-image':
        return 'Image';
    default:
        throw new Error("Cannot determine asset from relation: " + require('sys').inspect(relation));
    }
    // FIXME: Extract mime type from data: urls
}

FsLoader.prototype = {
    addLabelResolver: function (labelName, Constructor, config) {
        config = config || {};
        config.root = this.root;
        this.labelResolvers[labelName] = new Constructor(config);
    },

    // cb(err, [resolvedRelation, resolvedRelation...])
    resolveRelation: function (relation, cb) {
        if (relation.inlineData) {
            process.nextTick(function () {
                return cb(null, [relation]);
            });
        } else if (relation.url) {
            var This = this,
                matchLabel = relation.url.match(/^([\w\-]+):(.*)$/);
            if (matchLabel) {
                relation.label = matchLabel[1];
                if (!('originalUrl' in relation)) {
                    relation.originalUrl = relation.url;
                }
                relation.url = matchLabel[2];
                var resolver = This.labelResolvers[relation.label] || This.defaultLabelResolver;
                resolver.resolve(relation, error.passToFunction(cb, function (resolvedRelations) {
                    step(
                        function () {
                            var group = this.group();
                            resolvedRelations.forEach(function (resolvedRelation) {
                                This.resolveRelation(resolvedRelation, group());
                            });
                        },
                        error.passToFunction(cb, function (reresolvedRelations) {
                            cb(null, _.flatten(reresolvedRelations));
                        })
                    );
                }));
            } else {
                // No label, assume relative path
                cb(null, [_.extend({url: path.join(relation.baseUrl, relation.url)}, relation)]);
            }
        } else {
            // No url and no inlineData, give up.
            cb(new Error("Cannot resolve relation"));
        }
    },

    loadAsset: function (relation, cb) {
        if ('url' in relation) {
            var alreadyLoaded = this.siteGraph.assetsByUrl[relation.url];
            if (alreadyLoaded) {
                return alreadyLoaded;
            }
        }
        var This = this,
            type = determineAssetType(relation),
            Constructor = assets.byType[type],
            id = this.nextId += 1,
            config = {
                id: id,
                baseUrl: relation.baseUrl
            };

        if ('inlineData' in relation) {
            config.srcProxy = function (cb) {
                if (cb) {
                    process.nextTick(function () {
                        cb(null, relation.inlineData);
                    });
                } else {
                    // TODO: Return a stream that emits the inlineData blob in one go
                }
            };
        } else if ('url' in relation) {
            config.url = relation.url;
            config.srcProxy = function (cb) {
                var fileName = path.join(This.root, relation.url),
                    encoding = Constructor.prototype.encoding;
                if (cb) {
                    fs.readFile(fileName, encoding, cb);
                } else {
                    return fs.createReadStream(fileName, {encoding: encoding});
                }
            };
        } else {
            cb(new Error("loadAsset cannot make sense of " + util.inspect(relation)));
        }
        if ('assetRelations' in relation) {
            config.relations = relation.assetRelations;
        }
        var asset = new Constructor(config);
        this.siteGraph.addAsset(asset);
        return asset;
/*
        if ('url' in relation && relation.url in this.assetLoadingQueues) {
            this.assetLoadingQueues[relation.url].forEach(function (waitingCallback) {
                console.log("Running callback waiting for " + relation.url);
                process.nextTick(function () {
                    waitingCallback(null, asset);
                });
            });
            delete this.waitingForAsset[relation.url];
        }
        process.nextTick(function () {
            cb(null, asset);
        });
*/
    },

    populateRelationType: function (asset, relationType, cb) {
        var This = this,
            allResolvedRelationsInOrder = [];
        step(
            function () {
                asset.getRelationsOfType(relationType, this);
            },
            error.throwException(function (relationsOfType) {
                if (relationsOfType.length) {
                    relationsOfType.forEach(function (relation) {
                        This.resolveRelation(relation, this.parallel());
                    }, this);
                } else {
                    process.nextTick(function () {
                        cb(null, []);
                    });
                }
            }),
            error.throwException(function () { // [[resolved relations for relation 1], ...]
                var assets = [];
                var group = this.group();
                _.toArray(arguments).forEach(function (resolvedRelations, i) {
                    [].push.apply(allResolvedRelationsInOrder, resolvedRelations);
                    resolvedRelations.forEach(function (resolvedRelation) {
                        assets.push(This.loadAsset(resolvedRelation));
                    });
                }, this);
                // asset.relations[relationType] = allResolvedRelationsInOrder; // Add to graph instead!
                cb(null, assets);
            })
        );
    },

    populate: function (asset, relationTypes, cb) {
        if (asset.id in this.populatedAssets) {
//console.log("Asset id " + asset.id + " seen before, stopping population");
            return cb();
        } else {
            this.populatedAssets[asset.id] = true;
        }
        var This = this;
        step(
            function () {
                relationTypes.forEach(function (relationType) {
//console.log("Calling populateRelationType " + relationType + " for " + ppAsset(asset));
                    This.populateRelationType(asset, relationType, this.parallel());
                }, this);
            },
            error.throwException(function () { // [[loaded assets for relationTypes[0]], ...]
                var loadedAssets = _.flatten(_.toArray(arguments));
//console.log("loadedAssets flattened = " + loadedAssets.map(ppAsset).join(", "));
                if (loadedAssets.length) {
                    var group = this.group();
                    loadedAssets.forEach(function (loadedAsset) {
//console.log("populating loadedAsset = " + ppAsset(loadedAsset));
//process.exit();
                        This.populate(loadedAsset, relationTypes, group());
                    });
                } else {
                    return cb(null, []);
                }
            }),
            cb
        );
    }
};
