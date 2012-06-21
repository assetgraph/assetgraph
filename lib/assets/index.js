/*global exports, require*/
var childProcess = require('child_process'),
    util = require('util'),
    Path = require('path'),
    _ = require('underscore'),
    seq = require('seq'),
    passError = require('../util/passError'),
    urlTools = require('../util/urlTools'),
    assets = {};

assets.typeByExtension = {};

assets.typeByContentType = {};

assets.register = function (type, Constructor) {
    var prototype = Constructor.prototype;
    prototype.type = type;
    assets[type] = Constructor;
    if (prototype.contentType && !(prototype.contentType in assets.typeByContentType)) {
        assets.typeByContentType[prototype.contentType] = type;
    }
    if (prototype.defaultExtension) {
        assets.typeByExtension[prototype.defaultExtension] = type;
    }
    if (prototype.alternativeExtensions) {
        prototype.alternativeExtensions.forEach(function (alternativeExtension) {
            assets.typeByExtension[alternativeExtension] = type;
        });
    }
};

assets.lookupContentType = function (contentType) {
    if (contentType) {
        // Trim whitespace and semicolon suffixes such as ;charset=...
        contentType = contentType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase(); // Will always match
        if (contentType in assets.typeByContentType) {
            return assets.typeByContentType[contentType];
        } else if (/\+xml$/i.test(contentType)) {
            return 'Xml';
        } else if (/^text\//i.test(contentType)) {
            return 'Text';
        } else {
            return 'Asset';
        }
    }
};

// Tricky business: Might also modify assetConfig.url and assetConfig.rawSrc
assets.ensureAssetConfigHasType = function (assetConfig, cb) {
    if (assetConfig.isAsset || assetConfig.type) {
        return process.nextTick(cb);
    }
    // Looks like there's no way around loading the asset and looking at the src or metadata
    return assetConfig.rawSrcProxy(passError(cb, function (rawSrc, metadata) {
        assetConfig.rawSrc = rawSrc;
        if (metadata) {
            _.extend(assetConfig, metadata);
        }
        function foundType(type) {
            if (type) {
                assetConfig.type = type;
                cb();
            } else {
                cb(new Error("assets.ensureAssetConfigHasType: Couldn't determine asset type from asset config: " + util.inspect(assetConfig)));
            }
        }
        if (metadata && metadata.url) {
            var newExtension = Path.extname(assetConfig.url.replace(/[\?\#].*$/, ""));
            if (newExtension in assets.typeByExtension) {
                return foundType(assets.typeByExtension[newExtension]);
            }
        }
        if (metadata && metadata.contentType) {
            // If the asset was served using HTTP, we shouldn't try to second guess by sniffing.
            foundType(assets.lookupContentType(metadata.contentType));
        } else if (rawSrc.length === 0) {
            foundType(); // Give up
        } else {
            // Work the magic
            var fileProcess = childProcess.spawn('file', ['-b', '--mime-type', '-']),
                fileOutput = '';
            fileProcess.stdout.on('data', function (chunk) {
                fileOutput += chunk;
            }).on('end', function () {
                foundType(assets.lookupContentType(fileOutput.match(/^([^\n]*)/)[1]));
            });
            fileProcess.stdin.end(rawSrc);
        }
    }));
};

assets.create = function (assetConfig) {
    if (!assetConfig.type) {
        throw new Error("assets.create: No type provided in assetConfig" + util.inspect(assetConfig));
    }
    if (assetConfig.isAsset) {
        return assetConfig;
    } else {
        return new assets[assetConfig.type](assetConfig);
    }
};

assets.resolveConfig = function (assetConfig, fromUrl, assetGraph, cb) {
    if (_.isArray(assetConfig)) {
        // Call ourselves recursively for each item, flatten the results and report back
        if (assetConfig.some(_.isArray)) {
            return cb(new Error("assets.resolveConfig: Multidimensional array not supported."));
        }
        return seq(assetConfig)
            .parMap(function (_assetConfig) {
                assets.resolveConfig(_assetConfig, fromUrl, assetGraph, this);
            })
            .unflatten()
            .seq(function (resolvedAssetConfigs) {
                cb(null, _.flatten(resolvedAssetConfigs));
            })
            ['catch'](cb);
    }
    if (typeof assetConfig === 'string') {
        assetConfig = {url: assetConfig};
    }
    if (assetConfig.isAsset || assetConfig.isResolved) {
        // Almost done, add .type property if possible (this is all we can do without actually fetching the asset):
        assetConfig.type =
            assetConfig.type ||
            (assetConfig.contentType && assets.lookupContentType(assetConfig.contentType)) ||
            assets.typeByExtension[Path.extname(assetConfig.url.replace(/[\?\#].*$/, ""))];
        return process.nextTick(function () {
            cb(null, assetConfig);
        });
    } else if (assetConfig.url) {
        if (/^[a-zA-Z\+]+:/.test(assetConfig.url)) {
            var protocol = assetConfig.url.substr(0, assetConfig.url.indexOf(':')),
                resolver = assetGraph.resolverByProtocol[protocol] || assetGraph.defaultResolver;
            if (resolver) {
                resolver(assetConfig, fromUrl, passError(cb, function (resolvedAssetConfig) {
                    // Keep reresolving until the .isResolved property shows up:
                    assets.resolveConfig(resolvedAssetConfig, fromUrl, assetGraph, cb);
                }));
            } else {
                return process.nextTick(function () {
                    cb(new Error("assets.resolveConfig: No resolver found for protocol: " + protocol));
                });
            }
        } else {
            if (/^\/(?:[^\/]|$)/.test(assetConfig.url) && /^file:/.test(fromUrl) && /^file:/.test(assetGraph.root)) {
                assetConfig.url = urlTools.resolveUrl(assetGraph.root, encodeURI(assetConfig.url.substr(1)));
            } else {
                assetConfig.url = urlTools.resolveUrl(fromUrl, encodeURI(assetConfig.url));
            }
            assets.resolveConfig(assetConfig, fromUrl, assetGraph, cb);
        }
    } else {
        process.nextTick(function () {
            cb(new Error("assets.resolveConfig: Cannot resolve asset config (no url): " + util.inspect(assetConfig)));
        });
    }
};

require('fs').readdirSync(__dirname).forEach(function (fileName) {
    if (/\.js$/.test(fileName) && fileName !== 'index.js') {
        assets.register(fileName.replace(/\.js$/, ''), require('./' + fileName));
    }
});

_.extend(exports, assets);
