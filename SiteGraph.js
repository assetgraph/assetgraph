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
        relation: ['type', 'from', 'to'],
        asset: ['type', 'isInitial']
    };

function SiteGraph(config) {
    _.extend(this, config || {});
    if (!/^[^:]+:/.test(this.root)) { // No protocol?
        this.root = fileUtils.fsPathToFileUrl(this.root || process.cwd(), true); // forceDirectory
    }
    this.assets = [];
    this.relations = [];
    this.indices = {};
    this.assetsById = {};
    this.relationsById = {};
    this.assetsByUrl = {};
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
    _addToIndices: function (indexType, obj, position, adjacentObj) { // position and adjacentRelation are optional
        if (indexType === 'asset') {
            this.assetsById[obj.id] = obj;
            if (obj.url) {
                this.assetsByUrl[obj.url] = obj;
            }
        } else {
            this.relationsById[obj.id] = obj;
        }
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

    _removeFromIndices: function (indexType, obj) {
        if (indexType === 'asset') {
            if (obj.url) {
                delete this.assetsByUrl[obj.url];
            }
            delete this.assetsById[obj.id];
        } else {
            delete this.relationsById[obj.id];
        }
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
                        throw "_removeFromIndices: object not found in index!";
                    } else {
                        index[key].splice(i, 1);
                    }
                }
            }
        }, this);
    },

    _lookupIndex: function (indexType, indexName, value) {
        return this.indices[indexType][indexName][typeof value === 'object' ? value.id : value] || [];
    },

    findRelations: function (indexName, value) {
        return [].concat(this._lookupIndex('relation', indexName, value));
    },

    findAssets: function (indexName, value) {
        return [].concat(this._lookupIndex('asset', indexName, value));
    },

    // "root/relative/path.html"
    // "file:///home/foo/thething.jpg"
    // "http://example.com/hereiam.css"
    // {originalSrc: "thesource", type: "CSS"}
    registerAsset: function (asset, isInitial) {
        if (!asset.isAsset) {
            var resolvedAssetConfig = this.resolveAssetConfig(asset);
            if (resolvedAssetConfig.url && this.assetsByUrl[resolvedAssetConfig.url]) {
                // Already loaded
                return this.assetsByUrl[resolvedAssetConfig.url];
            }
            if (!resolvedAssetConfig.type) {
                throw new Error("Cannot work out asset type: " + require('sys').inspect(resolvedAssetConfig));
            }
            asset = new assets[resolvedAssetConfig.type](resolvedAssetConfig);
        }
        asset.isInitial = true;
        this.assets.push(asset);
        this._addToIndices('asset', asset);
        return asset;
    },

    unregisterAsset: function (asset, cascade) { // Perhaps just cascade by default?
        if (cascade) {
            this.findRelations('to', asset).forEach(function (incomingRelation) {
                this.unregisterRelation(incomingRelation);
            }, this);
            this.findRelations('from', asset).forEach(function (outgoingRelation) {
                this.unregisterRelation(outgoingRelation);
            }, this);
        }
        var i = this.assets.indexOf(asset);
        if (i === -1) {
            throw new Error("unregisterAsset: " + asset + " not in graph");
        } else {
            this.assets.splice(i, 1);
        }
        this._removeFromIndices('asset', asset);
        return this;
    },

    assetIsOrphan: function (asset) {
        return !this.findRelations('to', asset).length;
    },

    inlineRelation: function (relation, cb) {
        var incomingRelationsForTarget = this.findRelations('to', relation.to);
        if (incomingRelationsForTarget.length !== 1 || incomingRelationsForTarget[0] !== relation) {
            // FIXME: Maybe create a copy instead of complaining?
            throw new Error("SiteGraph.inlineRelation " + relation + ": Target asset has " + incomingRelationsForTarget.length + " incoming relations, cannot inline");
        }

        this.findRelations('from', relation.to).forEach(function (relationFromInlinedAsset) {
            if (relationFromInlinedAsset.to.url) {
               relationFromInlinedAsset._setRawUrlString(fileUtils.buildRelativeUrl(relation.from.url, relationFromInlinedAsset.to.url));
            }
        }, this);
        if (relation.to.url) {
            delete this.assetsByUrl[relation.to.url];
            delete relation.to.url;
        }
        relation._inline(cb);
    },

    _findBaseAsset: function (fromAsset) {
        var baseAsset = fromAsset;
        while (!baseAsset.url) {
            var parentRelations = this.findRelations('to', baseAsset);
            if (parentRelations.length === 1) {
                baseAsset = parentRelations[0].from;
            } else if (parentRelations.length > 1) {
                throw new Error("SiteGraph._findBaseAsset: Inline asset " + baseAsset + " has multiple incoming relations");
            } else {
                throw new Error("SiteGraph._findBaseAsset: Cannot find non-inline parent of " + fromAsset);
            }
        }
        return baseAsset;
    },

    setAssetUrl: function (asset, url) {
        if (asset.url) {
            delete this.assetsByUrl[asset.url];
        } else {
            throw new Error("SiteGraph.setAssetUrl: Cannot set url of an inline asset (not implemented yet)");
        }
        this.findRelations('to', asset).forEach(function (incomingRelation) {
            incomingRelation._setRawUrlString(fileUtils.buildRelativeUrl(this._findBaseAsset(incomingRelation.from).url, url));
        }, this);
        asset.url = url;
        this.assetsByUrl[asset.url] = asset;
        return this;
    },

    // Register the relations in order, or specify position and adjacentRelation to splice them in later
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
        this._addToIndices('relation', relation, position, adjacentRelation);
        return this;
    },

    attachAndRegisterRelation: function (relation, position, adjacentRelation) {
        relation.from.attachRelation(relation, position, adjacentRelation);
        this.registerRelation(relation, position, adjacentRelation);
        if (relation.to.url) {
            relation._setRawUrlString(fileUtils.buildRelativeUrl(this._findBaseAsset(relation.from).url, relation.to.url));
        }
    },

    unregisterRelation: function (relation) {
        this._removeFromIndices('relation', relation);
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
            if (!(asset.id in subgraph.assetsById)) {
                subgraph.registerAsset(asset, asset.isInitial); // Careful
                that.findRelations('from', asset).forEach(function (relation) {
                    if (relationLambda(relation)) {
                        if (relation.to) {
                            traverse(relation.to);
                        } else {
                            console.log("siteGraph.lookupSubgraph: No 'to' attribute found on " + relation + " -- not populated yet?");
                        }
                        if (!(relation.id in subgraph.relationsById)) {
                            subgraph.registerRelation(relation);
                        }
                    }
                });
            }
        }(startAsset));
        return subgraph;
    },

    resolveAssetConfig: function (assetConfig, fromUrl) {
        if (!fromUrl) {
            fromUrl = this.root;
        }
        if (typeof assetConfig === 'string') {
            assetConfig = {
                url: URL.resolve(fromUrl, assetConfig)
            };
        }
        if (assetConfig.url) {
            var protocol = assetConfig.url.substr(0, assetConfig.url.indexOf(':'));
            if (protocol === 'data') {
                var dataUrlMatch = assetConfig.url.match(/^data:([\w\/\-]+)(;base64)?,(.*)$/);
                if (dataUrlMatch) {
                    var contentType = dataUrlMatch[1];
                    if (dataUrlMatch[2]) {
                        assetConfig.originalSrc = new Buffer(dataUrlMatch[3], 'base64').toString();
                    } else {
                        assetConfig.originalSrc = dataUrlMatch[3];
                    }
                    if (!assetConfig.type) {
                        if (contentType in assets.typeByContentType) {
                            assetConfig.type = assets.typeByContentType[contentType];
                        } else {
                            throw new Error("Unknown Content-Type " + contentType + " in data url: " + assetConfig.url);
                        }
                    }
                } else {
                    throw new Error("Cannot parse data url: " + assetConfig.url);
                }
            }
            if (protocol === 'file') {
                assetConfig.originalSrcProxy = function (cb) {
                    var fsPath = fileUtils.fileUrlToFsPath(assetConfig.url);
                    // Will be invoked in the asset's scope, so this.encoding works out.
                    if (typeof cb === 'function') {
                        fs.readFile(fsPath, this.encoding, cb);
                    } else {
                        return fs.createReadStream(fsPath, {encoding: this.encoding});
                    }
                };
            } else if (protocol === 'http' || protocol === 'https') {
                assetConfig.originalSrcProxy = function (cb) {
                    // FIXME: Find a way to return a stream if cb is undefined
                    request({
                        url: assetConfig.url
                    }, function (err, response, body) {
                        if (response.statusCode >= 400) {
                            err = new Error("Got " + response.statusCode + " from remote server!");
                        }
                        cb(err, body);
                   });
                };
            }
        }
        if (!assetConfig.type && assetConfig.url) {
            var extension = path.extname(assetConfig.url);
            if (extension in assets.typeByExtension) {
                assetConfig.type = assets.typeByExtension[extension];
            }
        }
        return assetConfig;
    },

    // Add your callback as the last transform at the end of the list
    applyTransforms: function () { // ...
        var that = this,
            transforms = _.toArray(arguments),
            nextStepNo = 0;
        function executeNextStep (err) {
            if (err) {
                throw err;
            }
//console.log(nextStepNo + " " + transforms[nextStepNo]);
console.log(nextStepNo);
            if (nextStepNo < transforms.length) {
                var nextTransform = transforms[nextStepNo];
                nextStepNo += 1;
                nextTransform(that, executeNextStep);
            }
        }
        executeNextStep();
    }
};

module.exports = SiteGraph;
