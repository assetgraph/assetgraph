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
                process.nextTick(function () {
                    cb(null, alreadyLoaded);
                });
                return;
            } else if (relation.url in this.assetLoadingQueues) {
                this.assetLoadingQueues[relation.url].push(cb);
                return;
            }
        }
        var type = determineAssetType(relation),
            Constructor = assets.byType[type],
            id = this.nextId += 1,
            createAssetFromSrc = function (src) {
                var config = {
                    id: id,
                    baseUrl: relation.baseUrl,
                    src: src
                };
                if ('url' in relation) {
                    config.url = relation.url;
                }
                var asset = new Constructor(config);
                this.siteGraph.addAsset(asset);

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
            }.bind(this);

        if ('inlineData' in relation) {
            createAssetFromSrc(relation.inlineData);
        } else if ('url' in relation) {
            this.siteGraph.assetsByUrl[relation.url] = relation.id; // Placeholder until it's loaded
            var encoding = Constructor.prototype.encoding;
            fs.readFile(path.join(this.root, relation.url), encoding, error.throwException(createAssetFromSrc));
        } else {
            throw new Error("loadAsset cannot make sense of " + util.inspect(relation));
        }
    },

    populateRelationType: function (asset, relationType, cb) {
//console.log("populateRelationType " + relationType + " " + ppAsset(asset));
        var This = this,
            relationsOfType = asset.relations[relationType] || [],
            allResolvedRelationsInOrder = [];
        if (!relationsOfType.length) {
//console.log("No " + relationType + " relations in " + ppAsset(asset) + ", exiting");
//console.log("These are the ones in there: " + _.keys(asset.relations).map(function (key) {return key + ": " + _.keys(asset.relations[key]).length; }).join(", "));
            process.nextTick(function () {
                cb(null, []);
            });
        }
        step(
            function () {
                relationsOfType.forEach(function (relation) {
//console.log("Resolving relation " + ppRelation(relation));
                    This.resolveRelation(relation, this.parallel());
                }, this);
            },
            error.throwException(function () { // [[resolved relations for relation 1], ...]
//console.log("arguments = " + require('sys').inspect(arguments));
                var group = this.group();
                _.toArray(arguments).forEach(function (resolvedRelations, i) {
//console.log("resolvedRelations = " + require('sys').inspect(resolvedRelations));
                    [].push.apply(allResolvedRelationsInOrder, resolvedRelations);
                    resolvedRelations.forEach(function (resolvedRelation) {
//console.log("Saw resolved relation = " + ppRelation(resolvedRelation));
                        This.loadAsset(resolvedRelation, group());
                    });
                }, this);
            }),
            error.throwException(function (loadedAssets) {
                asset.relations[relationType] = allResolvedRelationsInOrder;
                cb(null, loadedAssets);
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
