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

function determinePointerTargetType(pointer) {
    if ('url' in pointer) {
        var assetType = assets.typeByExtension[path.extname(pointer.url)];
        if (assetType) {
            return assetType;
        }
    }
    // Inline assets:
    switch (pointer.type) {
    case 'html-script-tag':
    case 'js': // FIXME
        return 'JavaScript';
    case 'html-style-tag':
    case 'css': // FIXME
        return 'CSS';
    case 'css-background-image':
        return 'Image';
    default:
        throw new Error("Cannot determine asset from pointer: " + require('sys').inspect(pointer));
    }
    // FIXME: Extract mime type from data: urls
}

FsLoader.prototype = {
    addLabelResolver: function (labelName, Constructor, config) {
        config = config || {};
        config.root = this.root;
        this.labelResolvers[labelName] = new Constructor(config);
    },

    // cb(err, [resolvedPointer, resolvedPointer...])
    resolvePointer: function (pointer, cb) {
        if (pointer.inlineData) {
            process.nextTick(function () {
                return cb(null, [pointer]);
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
                resolver.resolve(pointer, error.passToFunction(cb, function (resolvedPointers) {
                    step(
                        function () {
                            var group = this.group();
                            resolvedPointers.forEach(function (resolvedPointer) {
                                This.resolvePointer(resolvedPointer, group());
                            });
                        },
                        error.passToFunction(cb, function (reresolvedPointers) {
                            cb(null, _.flatten(reresolvedPointers));
                        })
                    );
                }));
            } else {
                // No label, assume relative path
                cb(null, [_.extend({url: path.join(pointer.baseUrl, pointer.url)}, pointer)]);
            }
        } else {
            // No url and no inlineData, give up.
            cb(new Error("Cannot resolve pointer"));
        }
    },

    loadAsset: function (pointer, cb) {
        if ('url' in pointer) {
            var alreadyLoaded = this.siteGraph.assetsByUrl[pointer.url];
            if (alreadyLoaded) {
                return alreadyLoaded;
            }
        }
        var This = this,
            type = determinePointerTargetType(pointer),
            Constructor = assets.byType[type],
            id = this.nextId += 1,
            config = {
                id: id,
                baseUrl: pointer.baseUrl
            };

        if ('inlineData' in pointer) {
            config.srcProxy = function (cb) {
                if (cb) {
                    process.nextTick(function () {
                        cb(null, pointer.inlineData);
                    });
                } else {
                    // TODO: Return a stream that emits the inlineData blob in one go
                }
            };
        } else if ('url' in pointer) {
            config.url = pointer.url;
            config.srcProxy = function (cb) {
                var fileName = path.join(This.root, pointer.url),
                    encoding = Constructor.prototype.encoding;
                if (cb) {
                    fs.readFile(fileName, encoding, cb);
                } else {
                    return fs.createReadStream(fileName, {encoding: encoding});
                }
            };
        } else {
            cb(new Error("loadAsset cannot make sense of pointer: " + util.inspect(pointer)));
        }
        if ('assetPointers' in pointer) { // Premature optimization?
            config.pointers = pointer.assetPointers;
        }
        var asset = new Constructor(config);
        this.siteGraph.addAsset(asset);
        return asset;
    },

    populatePointerType: function (asset, pointerType, cb) {
        var This = this,
            allResolvedPointersInOrder = [];
        step(
            function () {
                asset.getPointersOfType(pointerType, this);
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
                _.toArray(arguments).forEach(function (resolvedPointers, i) {
                    [].push.apply(allResolvedPointersInOrder, resolvedPointers);
                    resolvedPointers.forEach(function (resolvedPointer) {
                        assets.push(This.loadAsset(resolvedPointer));
                    });
                }, this);
                // asset.pointers[pointerType] = allResolvedPointersInOrder; // Add to graph instead!
                cb(null, assets);
            })
        );
    },

    populate: function (asset, pointerTypes, cb) {
        if (asset.id in this.populatedAssets) {
            return cb();
        } else {
            this.populatedAssets[asset.id] = true;
        }
        var This = this;
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
