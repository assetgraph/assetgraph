var child_process = require('child_process'),
    path = require('path'),
    fs = require('fs'),
    constants = process.ENOENT ? process : require('constants'),
    URL = require('url'),
    glob = require('glob'),
    request = require('request'),
    _ = require('underscore'),
    step = require('step'),
    fileUtils = require('./fileUtils'),
    error = require('./error'),
    assets = require('./assets');

require('bufferjs');

function AssetConfigResolver(config) {
    _.extend(this, config || {});
    if (!/^[^:]+:/.test(this.root)) { // No protocol?
        this.root = fileUtils.fsDirToFileUrl(this.root || process.cwd());
    }
    this.protocols = this.protocols || {};
};

AssetConfigResolver.prototype.resolve = function (assetConfig, fromUrl, cb) {
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
                        that.resolve(_assetConfig, fromUrl, group());
                    });
                },
                error.passToFunction(cb, function (resolvedAssetConfigs) {
                    cb(null, _.flatten(resolvedAssetConfigs));
                })
            );
        }
    }
    if (typeof assetConfig === 'string') {
        if (/^\//.test(assetConfig) && /^file:/.test(fromUrl) && /^file:/.test(that.root)) {
            assetConfig = {url: that.root + assetConfig.substr(1)};
        } else {
            assetConfig = {url: URL.resolve(fromUrl, assetConfig)};
        }
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
                        that.resolve(fsPaths.map(function (fsPath) {
                            return 'file://' + fsPath;
                        }), fromUrl, cb);
                    }
                }));
            }
            assetConfig.rawSrcProxy = function (cb) {
                fs.readFile(pathname, null, cb);
            };
        } else if (protocol === 'http' || protocol === 'https') {
            assetConfig.rawSrcProxy = function (cb) {
                request({
                    url: assetConfig.url,
                    onResponse: true
                }, error.passToFunction(cb, function (response) {
                    if (response.statusCode >= 400) {
                        cb(new Error("Got " + response.statusCode + " from remote server: " + assetConfig.url));
                    } else {
                        var assetType = assets.lookupContentType(assetConfig.contentType || response.headers['content-type']),
                            buffers = [];
                        response.on('data', function (buffer) {
                            buffers.push(buffer);
                        }).on('end', function () {
                            cb(null, Buffer.concat(buffers), response.headers);
                        }).on('error', cb);
                    }
               }));
            };
        } else if (protocol === 'data') {
            var dataUrlMatch = pathname.match(/^([\w\/\-]+)(?:;charset=([\w\/\-]+))?(;base64)?,(.*)$/);
            if (dataUrlMatch) {
                var contentType = dataUrlMatch[1];
                if (dataUrlMatch[2]) {
                    assetConfig.encoding = dataUrlMatch[2];
                }
                if (dataUrlMatch[3]) {
                    assetConfig.rawSrc = new Buffer(dataUrlMatch[4], 'base64');
                } else {
                    assetConfig.rawSrc = new Buffer(dataUrlMatch[4], 'binary'); // FIXME: support percent-encoded bytes?
                }
                assetConfig.contentType = assetConfig.contentType || contentType;
            } else {
                cb(new Error("Cannot parse data url: " + assetConfig.url));
            }
        } else if (protocol in this.protocols) {
            return that.protocols[protocol].resolve(pathname, error.passToFunction(cb, function (resolvedAssetConfigs) {
                // Reresolve
                that.resolve(resolvedAssetConfigs, fromUrl, cb);
            }));
        } else if (/^file:/.test(fromUrl)) {
            return fileUtils.findParentDirCached(fileUtils.fileUrlToFsPath(fromUrl), protocol, error.passToFunction(cb, function (parentPath) {
                assetConfig.url = fileUtils.fsFilePathToFileUrl(parentPath + '/' + pathname);
                // Reresolve
                that.resolve(assetConfig, fromUrl, cb);
            }));
        } else {
            return cb(new Error("Cannot resolve assetConfig url: " + assetConfig.url));
        }
        if (!assetConfig.type) {
            if (assetConfig.contentType) {
                assetConfig.type = assets.lookupContentType(assetConfig.contentType);
            } else {
                var extension = path.extname(assetConfig.url.replace(/\?.*$/, ""));
                if (extension in assets.typeByExtension) {
                    assetConfig.type = assets.typeByExtension[extension];
                } else {
                    // Looks like there's no way around loading the asset and looking at the src or HTTP headers
                    return assetConfig.rawSrcProxy(function (err, src, headers) {
                        if (err) {
                            if (err.errno === constants.EISDIR) {
                                assetConfig.url += /\/$/.test(assetConfig.url) ? 'index.html' : '/index.html';
                                delete assetConfig.rawSrcProxy;
                                return that.resolve(assetConfig, fromUrl, cb);
                            } else {
                                return cb(err);
                            }
                        }
                        function foundType(type) {
                            if (!type) {
                                return cb(new Error("Cannot determine asset type for " + assetConfig.url));
                            }
                            assetConfig.rawSrc = src;
                            assetConfig.type = type;
                            cb(null, assetConfig);
                        }
                        if (headers && headers['content-type']) {
                            // If the asset was served using HTTP, we shouldn't try to second guess by sniffing.
                            foundType(assets.lookupContentType(headers['content-type']));
                        } else {
                            // Work the magic
                            var fileProcess = child_process.spawn('file', ['-b', '--mime-type', '-']),
                                fileOutput = '';
                            fileProcess.stdout.on('data', function (chunk) {
                                fileOutput += chunk;
                            }).on('end', function () {
                                foundType(assets.lookupContentType(fileOutput.match(/^([^\n]*)/)[1]));
                            });
                            fileProcess.stdin.write(src);
                            fileProcess.stdin.end();
                        }
                    });
                }
            }
        }
    }
    cb(null, assetConfig);
};

module.exports = AssetConfigResolver;
