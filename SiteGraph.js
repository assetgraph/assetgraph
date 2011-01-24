/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    URL = require('url'),
    request = require('request'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    assets = require('./assets'),
    relations = require('./relations'),
    error = require('./error'),
    allIndices = {
        relation: ['id', 'type', 'from', 'to'],
        asset: ['id', 'url', 'type']
    };

var SiteGraph = module.exports = function (config) {
    _.extend(this, config || {});
this.loadedAssetUrls = {}; // FIXMEFIXME

    if (typeof this.root === 'string') {
        // URL.resolve misbehaves if paths don't end with a slash
        if (!/\/$/.test(this.root)) {
            this.root += "/";
        }
        if (this.root[0] === '/') {
            this.root = URL.parse("file://" + this.root);
        } else {
            this.root = URL.parse("file://" + path.join(process.cwd(), this.root));
        }
    }
    this.assets = [];
    this.relations = [];
    this.indices = {};
    if (!this.customProtocols) {
        this.customProtocols = {};
    }
    _.each(allIndices, function (indexNames, indexType) {
        this.indices[indexType] = {};
        indexNames.forEach(function (indexName) {
            this.indices[indexType][indexName] = {};
        }, this);
    }, this);
};

SiteGraph.prototype = {
    addToIndices: function (indexType, obj, position, adjacentObj) { // position and adjacentRelation are optional
        allIndices[indexType].forEach(function (indexName) {
            position = position || 'last';
            if (indexName in obj) {
                var type = typeof obj[indexName],
                    key;
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    key = obj[indexName];
                } else if (type === 'object' && 'id' in obj[indexName]) {
                    key = obj[indexName].id;
                }
                if (typeof key !== 'undefined') {
                    var index = this.indices[indexType][indexName];
                    if (!(key in index)) {
                        index[key] = [obj];
                    } else {
                        if (position === 'last') {
                            index[key].push(obj);
                        } else if (position === 'first') {
                            index[key].unshift(obj);
                        } else { // 'before' or 'after'
                            var i = index[key].indexOf(adjacentObj) + (position === 'after' ? 1 : 0);
                            index[key].splice(i, 0, obj);
                        }
                    }
                }
            }
        }, this);
    },

    removeFromIndices: function (indexType, obj) {
        allIndices[indexType].forEach(function (indexName) {
            if (indexName in obj) {
                var type = typeof obj[indexName],
                    key;
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    key = obj[indexName];
                } else if (type === 'object' && 'id' in obj[indexName]) {
                    key = obj[indexName].id;
                }
                if (typeof key !== 'undefined') {
                    var index = this.indices[indexType][indexName],
                        i = index[key].indexOf(obj);
                    if (i === -1) {
                        throw "removeFromIndices: object not found in index!";
                    } else {
                        index[key].splice(i, 1);
                    }
                }
            }
        }, this);
    },

    lookupIndex: function (indexType, indexName, value) {
        return this.indices[indexType][indexName][typeof value === 'object' ? value.id : value] || [];
    },

    existsInIndex: function (indexType, indexName, value) {
        return this.lookupIndex(indexType, indexName, value).length > 0;
    },

    findRelations: function (indexName, value) {
        return this.lookupIndex('relation', indexName, value);
    },

    findAssets: function (indexName, value) {
        return this.lookupIndex('asset', indexName, value);
    },

    registerAsset: function (asset) {
        this.assets.push(asset);
        this.addToIndices('asset', asset);
        return this;
    },

    unregisterAsset: function (asset, cascade) {
        if (cascade) {
            [].concat(this.findRelations('to', asset)).forEach(function (incomingRelation) {
                this.unregisterRelation(incomingRelation);
            }, this);
            [].concat(this.findRelations('from', asset)).forEach(function (outgoingRelation) {
                this.unregisterRelation(outgoingRelation);
            }, this);
        }
        var i = this.assets.indexOf(asset);
        if (i === -1) {
            throw new Error("unregisterAsset: " + asset + " not in graph");
        } else {
            this.assets.splice(i, 1);
        }
        this.removeFromIndices('asset', asset);
        return this;
    },

    assetIsOrphan: function (asset) {
        return !this.findRelations('to', asset).length;
    },

    inlineRelation: function (relation, cb) {
        this.findRelations('from', relation.to).forEach(function (relrel) {
            if (!relrel.isInline) {
                relrel._setRawUrlString(fileUtils.buildRelativeUrl(relation.from.url, relrel.to.url));
            }
        }, this);
        relation._inline(cb);
    },

    setAssetUrl: function (asset, url) {
        asset.url = url;
        this.findRelations('to', asset).forEach(function (incomingRelation) {
            if (!incomingRelation.isInline) {
                incomingRelation._setRawUrlString(fileUtils.buildRelativeUrl(incomingRelation.from.url, url));
            }
        }, this);
        return this;
    },

    // Relations must be registered in order
    registerRelation: function (relation, position, adjacentRelation) { // position and adjacentRelation are optional,
        position = position || 'last';
        if (position === 'last') {
            this.relations.push(relation);
        } else if (position === 'first') {
            this.relations.unshift(relation);
        } else { // Assume 'before' or 'after'
            var i = this.relations.indexOf(adjacentRelation) + (position === 'after' ? 1 : 0);
            this.relations.splice(i, 0, relation);
        }
        this.addToIndices('relation', relation, position, adjacentRelation);
        return this;
    },

    attachAndRegisterRelation: function (relation, position, adjacentRelation) {
        relation.from.attachRelation(relation, position, adjacentRelation);
        this.registerRelation(relation, position, adjacentRelation);
        if (!relation.isInline) {
            if (relation.from.url && relation.to.url) {
                relation._setRawUrlString(fileUtils.buildRelativeUrl(relation.from.url, relation.to.url));
            } else {
                console.log("SiteGraph.attachAndRegisterRelation: warning, cannot set url of " + relation);
            }
        }
    },

    unregisterRelation: function (relation) {
        this.removeFromIndices('relation', relation);
        var i = this.relations.indexOf(relation);
        if (i === -1) {
            throw new Error("unregisterRelation: " + relation + " not in graph");
        } else {
            this.relations.splice(i, 1);
        }
        return this;
    },

    detachAndUnregisterRelation: function (relation) {
        relation.from.detachRelation(relation);
        this.unregisterRelation(relation);
        return this;
    },

    clone: function () {
        var clone = new SiteGraph();
        this.assets.forEach(function (asset) {
            clone.registerAsset(asset);
        });
        this.relations.forEach(function (relation) {
            clone.registerRelation(relation);
        });
        return clone;
    },

    // This cries out for a rich query facility/DSL!
    lookupSubgraph: function (startAsset, relationLambda) { // preorder
        var that = this,
            subgraph = new SiteGraph();
        (function traverse(asset) {
            if (!subgraph.existsInIndex('asset', 'id', asset)) {
                subgraph.registerAsset(asset);
                that.lookupIndex('relation', 'from', asset).forEach(function (relation) {
                    if (relationLambda(relation)) {
                        if (relation.to) {
                            traverse(relation.to);
                        } else {
                            console.log("siteGraph.lookupSubgraph: No 'to' attribute found on " + relation + " -- not populated yet?");
                        }
                        if (!subgraph.existsInIndex('relation', 'id', relation)) {
                            subgraph.registerRelation(relation);
                        }
                    }
                });
            }
        }(startAsset));
        return subgraph;
    },

    // "root/relative/path.html"
    // "file:///home/foo/thething.jpg"
    // "http://example.com/hereiam.css"
    // {originalSrc: "thesource", type: "CSS"}
    loadAsset: function (assetConfig, fromUrl, cb) {
        if (typeof fromUrl === 'function') {
            cb = fromUrl;
            fromUrl = this.root;
        }
        var that = this;
        this.resolveAssetConfig(assetConfig, fromUrl, error.passToFunction(cb, function (resolvedAssetConfig) {
            cb(null, that.loadResolvedAssetConfig(resolvedAssetConfig));
        }));
    },

    loadResolvedAssetConfig: function (assetConfig) {
        if (assetConfig.url) {
if (this.loadedAssetUrls[assetConfig.url.href]) {
return this.loadedAssetUrls[assetConfig.url.href];
}
            if (assetConfig.url.protocol === 'data:') {
                var dataUrlMatch = assetConfig.url.href.match(/^data:([\w\/\-]+)(;base64)?,(.*)$/);
                if (dataUrlMatch) {
                    var contentType = dataUrlMatch[1],
                        data = dataUrlMatch[3];
                    if (dataUrlMatch[2]) {
                        data = new Buffer(data, 'base64').toString();
                    }
                    assetConfig.originalSrc = data;
                    if (!assetConfig.type) {
                        if (contentType in assets.typeByContentType) {
                            assetConfig.type = assets.typeByContentType[contentType];
                        } else {
                            return cb(new Error("Unknown Content-Type " + contentType + " in data url: " + assetConfig.url.href));
                        }
                    }
                } else {
                    return cb(new Error("Cannot parse data url: " + assetConfig.url.href));
                }
            }
            if (assetConfig.url.protocol === 'file:') {
                assetConfig.originalSrcProxy = function (cb) {
                    var fsPath = fileUtils.fileUrlToFsPath(assetConfig.url);
                    // Will be invoked in the asset's scope, so this.encoding works out.
                    if (typeof cb === 'function') {
                        fs.readFile(fsPath, this.encoding, cb);
                    } else {
                        return fs.createReadStream(fsPath, {encoding: this.encoding});
                    }
                };
            } else if (assetConfig.url.protocol === 'http:' || assetConfig.url.protocol === 'https:') {
                // FIXME: Duplicated from the 'file:' case above
                assetConfig.originalSrcProxy = function (cb) {
                    // FIXME: Find a way to return a stream if cb is undefined
                    request({
                        uri: that.root + assetConfig.url
                    }, function (err, response, body) {
                        if (response.statusCode >= 400) {
                            err = new Error("Got " + response.statusCode + " from remote server!");
                        }
                        cb(err, body);
                    });
                };
            }
        }
        if (!assetConfig.type) {
            var extension = path.extname(assetConfig.url.pathname);
            if (extension in assets.typeByExtension) {
                assetConfig.type = assets.typeByExtension[extension];
            } else {
                throw cb(new Error("Cannot work out asset type from pathname: " + assetConfig.url.pathname));
            }
        }
        var asset = new assets[assetConfig.type](assetConfig);

if (assetConfig.url) {
this.loadedAssetUrls[assetConfig.url.href] = asset;
}
        this.registerAsset(asset);
        return asset;
    },

    resolveAssetConfig: function (assetConfig, fromUrl, cb) {
        var that = this;
        if (typeof assetConfig === 'string') {
            assetConfig = {
                url: URL.parse(URL.resolve(fromUrl, assetConfig))
            };
        }
        if ((assetConfig.url && /^(https?|data|file):$/.test(assetConfig.url.protocol)) || 'originalSrc' in assetConfig) {
            // Already resolved
            return process.nextTick(function () {
                cb(null, assetConfig);
            });
        } else if (assetConfig.url.protocol in this.customProtocols) {
            // Set pathname to the entire href sans "protocol:"
            assetConfig.url.pathname = assetConfig.url.href.substr(assetConfig.url.protocol.length);
            this.customProtocols[assetConfig.url.protocol].resolve(assetConfig.url, error.passToFunction(cb, function (resolvedAssetConfigs) {
                if (!_.isArray(resolvedAssetConfigs)) {
                    resolvedAssetConfigs = [resolvedAssetConfigs];
                }
                if (resolvedAssetConfigs.length === 0) {
                    return cb(null, []); // I have yet to see a use case for this, but...
                }
                step(
                    function () {
                        resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                            that.resolveAssetConfig(resolvedAssetConfig, fromUrl, this.parallel());
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
    }
};
