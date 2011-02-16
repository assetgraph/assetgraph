var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    glob = require('glob'),
    URL = require('url'),
    request = require('request'),
    path = require('path'),
    child_process = require('child_process'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    assets = require('./assets'),
    relations = require('./relations'),
    query = require('./query'),
    error = require('./error'),
    allIndices = {
        relation: ['type', 'from', 'to'],
        asset: ['type', 'isInitial']
    };

function AssetGraph(config) {
    _.extend(this, config || {});
    if (!/^[^:]+:/.test(this.root)) { // No protocol?
        this.root = fileUtils.fsDirToFileUrl(this.root || process.cwd());
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

AssetGraph.prototype = {
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

    _query: function (type, queryObj) {
        var that = this,
            numFields = 0,
            shortestIndexLookup;
        _.each(queryObj || {}, function (query, fieldName) {
            numFields += 1;
            var indexLookup;
            if (allIndices[type].indexOf(fieldName) !== -1) {
                if (_.isArray(query) && query.every(function (item) {
                    // Don't attempt index lookups if the array contains a query.not or something even worse:
                    return item.isAsset || item.isRelation || /^(?:string|boolean|number)$/.test(item);
                })) {
                    indexLookup = [];
                    query.forEach(function (value) {
                        Array.prototype.push.apply(indexLookup, that._lookupIndex(type, fieldName, value));
                    });
                } else {
                    var queryType = typeof query;
                    if (queryType === 'string' || queryType === 'boolean' || queryType === 'number' || query.isAsset || query.isRelation) {
                        indexLookup = that._lookupIndex(type, fieldName, query);
                    }
                }
                if (indexLookup && (!shortestIndexLookup || indexLookup.length < shortestIndexLookup.length)) {
                    shortestIndexLookup = indexLookup;
                }
            }
        });
        if (shortestIndexLookup && numFields === 1) {
            return [].concat(shortestIndexLookup);
        } else {
            return (shortestIndexLookup || that[type + 's']).filter(query.queryObjToMatcherFunction(queryObj));
        }
    },

    findAssets: function (queryObj) {
        return this._query('asset', queryObj);
    },

    findRelations: function (queryObj) {
        return this._query('relation', queryObj);
    },

    // "root/relative/path.html"
    // "file:///home/foo/thething.jpg"
    // "http://example.com/hereiam.css"
    // {originalSrc: "thesource", type: "CSS"}
    addAsset: function (asset) {
        if (asset.url && asset.url in this.assetsByUrl) {
            throw new Error("AssetGraph.addAsset: " + asset.url + " already loaded");
        }
        this.assets.push(asset);
        this._addToIndices('asset', asset);
    },

    removeAsset: function (asset, cascade) { // Perhaps just cascade by default?
        if (cascade) {
            this.findRelations({to: asset}).forEach(function (incomingRelation) {
                this.removeRelation(incomingRelation);
            }, this);
            this.findRelations({from: asset}).forEach(function (outgoingRelation) {
                this.removeRelation(outgoingRelation);
            }, this);
        }
        var i = this.assets.indexOf(asset);
        if (i === -1) {
            throw new Error("removeAsset: " + asset + " not in graph");
        } else {
            this.assets.splice(i, 1);
        }
        this._removeFromIndices('asset', asset);
        return this;
    },

    assetIsOrphan: function (asset) {
        return !this.findRelations({to: asset}).length;
    },

    inlineRelation: function (relation, cb) {
        var incomingRelationsForTarget = this.findRelations({to: relation.to});
        if (incomingRelationsForTarget.length !== 1 || incomingRelationsForTarget[0] !== relation) {
            // FIXME: Maybe create a copy instead of complaining?
            throw new Error("AssetGraph.inlineRelation " + relation + ": Target asset has " + incomingRelationsForTarget.length + " incoming relations, cannot inline");
        }

        this.findRelations({from: relation.to}).forEach(function (relationFromInlinedAsset) {
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
            var parentRelations = this.findRelations({to: baseAsset});
            if (parentRelations.length === 1) {
                baseAsset = parentRelations[0].from;
            } else if (parentRelations.length > 1) {
                throw new Error("AssetGraph._findBaseAsset: Inline asset " + baseAsset + " has multiple incoming relations");
            } else {
                throw new Error("AssetGraph._findBaseAsset: Cannot find non-inline parent of " + fromAsset);
            }
        }
        return baseAsset;
    },

    setAssetUrl: function (asset, url) {
        if (asset.url) {
            delete this.assetsByUrl[asset.url];
        } else {
            throw new Error("AssetGraph.setAssetUrl: Cannot set url of an inline asset (not implemented yet)");
        }
        this.findRelations({to: asset}).forEach(function (incomingRelation) {
            incomingRelation._setRawUrlString(fileUtils.buildRelativeUrl(this._findBaseAsset(incomingRelation.from).url, url));
        }, this);
        this.findRelations({from: asset}).forEach(function (outgoingRelation) {
            if (outgoingRelation.to.url) {
                outgoingRelation._setRawUrlString(fileUtils.buildRelativeUrl(url, outgoingRelation.to.url));
            }
        });
        asset.url = url;
        this.assetsByUrl[asset.url] = asset;
        return this;
    },

    // Add the relations in order, or specify position and adjacentRelation to splice them in later
    addRelation: function (relation, position, adjacentRelation) { // position and adjacentRelation are optional,
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

    attachAndAddRelation: function (relation, position, adjacentRelation) {
        relation.from.attachRelation(relation, position, adjacentRelation);
        this.addRelation(relation, position, adjacentRelation);
        if (relation.to.url) {
            relation._setRawUrlString(fileUtils.buildRelativeUrl(this._findBaseAsset(relation.from).url, relation.to.url));
        }
    },

    removeRelation: function (relation) {
        this._removeFromIndices('relation', relation);
        var i = this.relations.indexOf(relation);
        if (i === -1) {
            throw new Error("removeRelation: " + relation + " not in graph");
        } else {
            this.relations.splice(i, 1);
        }
        return this;
    },

    detachAndRemoveRelation: function (relation) {
        relation.from.detachRelation(relation);
        this.removeRelation(relation);
        return this;
    },

    clone: function () {
        var clone = new AssetGraph();
        this.assets.forEach(function (asset) {
            clone.addAsset(asset);
        });
        this.relations.forEach(function (relation) {
            clone.addRelation(relation);
        });
        return clone;
    },

    createSubgraph: function (startAsset, relationQuery) {
        var that = this,
            subgraph = new AssetGraph();
        (function traverse(asset) {
            if (!(asset.id in subgraph.assetsById)) {
                subgraph.addAsset(asset);
                that.findRelations(_.extend({from: asset}, relationQuery)).forEach(function (relation) {
                    if (relation.to) {
                        traverse(relation.to);
                    } else {
                        console.log("assetGraph.createSubgraph: No 'to' attribute found on " + relation + " -- not populated yet?");
                    }
                    if (!(relation.id in subgraph.relationsById)) {
                        subgraph.addRelation(relation);
                    }
                });
            }
        }(startAsset));
        return subgraph;
    },

    resolveAssetConfig: function (assetConfig, fromUrl, cb) {
        var that = this;
        if (_.isArray(assetConfig)) {
            // Call ourselves recursively for each item, flatten the results and report back
            if (!assetConfig.length) {
                return process.nextTick(function () {
                    cb(null, []);
                });
            } else {
                return step(
                    function () {
                        var group = this.group();
                        assetConfig.forEach(function (_assetConfig) {
                            that.resolveAssetConfig(_assetConfig, fromUrl, group());
                        });
                    },
                    error.passToFunction(cb, function (resolvedAssetConfigs) {
                        cb(null, _.flatten(resolvedAssetConfigs));
                    })
                );
            }
        }
        if (typeof assetConfig === 'string') {
            // Move file: wildcard expansion up here?
            assetConfig = {
                url: (/^\//.test(assetConfig) && /^file:/.test(fromUrl)) ? 'file://' + assetConfig : URL.resolve(fromUrl, assetConfig)
            };
        }
        if (assetConfig.url) {
            var protocol = assetConfig.url.substr(0, assetConfig.url.indexOf(':')),
                pathname = assetConfig.url.replace(/^\w+:(?:\/\/)?/, ""); // Strip protocol and two leading slashes if present
            if (protocol === 'file') {
                if (/[\*\?]/.test(pathname)) {
                    // Expand wildcard, then expand each resulting url
                    return glob.glob(pathname, error.passToFunction(cb, function (fsPaths) {
                        if (!fsPaths.length) {
                            cb(new Error("AssetGraph.resolveAssetConfig: Wildcard " + pathname + " expanded to nothing"));
                        } else {
                            that.resolveAssetConfig(fsPaths, fromUrl, cb);
                        }
                    }));
                }
                assetConfig.originalSrcProxy = function (cb) {
                    // Will be invoked in the asset's scope, so this.encoding works out.
                    if (typeof cb === 'function') {
                        fs.readFile(pathname, this.encoding, cb);
                    } else {
                        return fs.createReadStream(pathname, {encoding: this.encoding});
                    }
                };
            } else if (protocol === 'http' || protocol === 'https') {
                assetConfig.originalSrcProxy = function (cb) {
                    // FIXME: Find a way to return a stream if cb is undefined
                    request({
                        url: assetConfig.url
                    }, function (err, response, body) {
                        if (response.statusCode >= 400) {
                            cb(new Error("Got " + response.statusCode + " from remote server!"));
                        } else {
                            cb(null, body, response.headers);
                        }
                   });
                };
            } else if (protocol === 'data') {
                var dataUrlMatch = pathname.match(/^([\w\/\-]+)(;base64)?,(.*)$/); // TODO: Support ;charset=...
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
                            cb(new Error("Unknown Content-Type " + contentType + " in data url: " + assetConfig.url));
                        }
                    }
                } else {
                    cb(new Error("Cannot parse data url: " + assetConfig.url));
                }
            } else if (protocol in that.customProtocols) {
                return that.customProtocols[protocol].resolve(pathname, error.passToFunction(cb, function (resolvedAssetConfigs) {
                    // Reresolve
                    that.resolveAssetConfig(resolvedAssetConfigs, fromUrl, cb);
                }));
            } else if (/^file:/.test(fromUrl)) {
                return fileUtils.findParentDirCached(fileUtils.fileUrlToFsPath(fromUrl), protocol, error.passToFunction(cb, function (parentPath) {
                    assetConfig.url = fileUtils.fsFilePathToFileUrl(parentPath + '/' + pathname);
                    // Reresolve
                    that.resolveAssetConfig(assetConfig, fromUrl, cb);
                }));
            } else {
                return cb(new Error("Cannot resolve assetConfig url: " + assetConfig.url));
            }
            if (!assetConfig.type) {
                var extension = path.extname(assetConfig.url);
                if (extension in assets.typeByExtension) {
                    assetConfig.type = assets.typeByExtension[extension];
                } else {
                    // Looks like there's no way around loading the asset and looking at the src or HTTP headers
                    assetConfig.encoding = 'binary';
                    return assetConfig.originalSrcProxy(error.passToFunction(cb, function (src, headers) {
                        function foundType(type) {
                            if (assets[type].prototype.encoding === 'utf8') {
                                assetConfig.originalSrc = src.toString('utf8');
                            } else {
                                assetConfig.originalSrc = src;
                            }
                            assetConfig.type = type;
                            cb(null, assetConfig);
                        }
                        delete assetConfig.encoding;
                        if (headers && headers['content-type'] && headers['content-type'] in assets.typeByContentType) {
                            foundType(assets.typeByContentType[headers['content-type']]);
                        } else {
                            // Work the magic
                            var fileProcess = child_process.spawn('file', ['-b', '--mime-type', '-']),
                                fileOutput = '';
                            fileProcess.stdout.on('data', function (chunk) {
                                fileOutput += chunk;
                            }).on('end', function () {
                                var contentType = fileOutput.match(/^([^\n]*)/)[1];
                                if (contentType in assets.typeByContentType) {
                                    foundType(assets.typeByContentType[contentType]);
                                } else {
                                    return cb(new Error("Cannot determine asset type for " + assetConfig.url + " from extension: " + extension));
                                }
                            });
                            fileProcess.stdin.write(src);
                            fileProcess.stdin.end();
                        }
                    }));
                }
            }
        }
        cb(null, assetConfig);
    },

    // Add your callback as the last transform at the end of the list (transforms.escapeToCallback yadda)
    transform: function () { // ...
        var that = this,
            transforms = _.toArray(arguments),
            nextStepNo = 0;
        function executeNextStep (err) {
            if (err) {
                throw err;
            }
            if (nextStepNo < transforms.length) {
                var nextTransform = transforms[nextStepNo],
                    startTime = new Date();
                nextStepNo += 1;
                nextTransform(that, error.logAndExit(function () {
//                    console.log(nextTransform.name + ': ' + (new Date() - startTime));
                    executeNextStep();
                }));
            }
        }
        executeNextStep();
    }
};

module.exports = AssetGraph;
