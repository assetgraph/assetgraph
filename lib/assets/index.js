/*global exports, require*/
var child_process = require('child_process'),
    constants = process.ENOENT ? process : require('constants'),
    Path = require('path'),
    _ = require('underscore'),
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
            return 'Base';
        }
    }
};

assets.addTypeToAssetConfig = function (assetConfig, cb) {
    var type =
        assetConfig.type ||
        (assetConfig.contentType && assets.lookupContentType(assetConfig.contentType)) ||
        assets.typeByExtension[Path.extname(assetConfig.url.replace(/[\?\#].*$/, ""))];
    if (type) {
        assetConfig.type = type;
        process.nextTick(function () {
            cb(null, assetConfig);
        });
    } else {
        // Looks like there's no way around loading the asset and looking at the src or HTTP headers
        return assetConfig.rawSrcProxy(function (err, src, metadata) {
            if (err) {
                if (err.errno === constants.EISDIR || err.errno === constants.EINVAL) {
                    assetConfig.url = assetConfig.url.replace(/(\/)?((?:[?#].*$)|$)/, '/index.html$2');
                    delete assetConfig.rawSrcProxy;
                    assetConfig.type = 'Html';
                    return cb(null, assetConfig);
                } else {
                    return cb(err);
                }
            }
            function foundType(type) {
                assetConfig.rawSrc = src;
                assetConfig.type = type;
                cb(null, assetConfig);
            }
            if (metadata && metadata.contentType) {
                // If the asset was served using HTTP, we shouldn't try to second guess by sniffing.
                foundType(assets.lookupContentType(metadata.contentType));
            } else if (src.length === 0) {
                foundType(); // Give up
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
};

assets.create = function (assetConfig) {
    if (!assetConfig.type) {
        throw new Error("assets.create: No type provided in assetConfig");
    }
    if (assetConfig.isAsset) {
        return assetConfig;
    } else {
        return new assets[assetConfig.type](assetConfig);
    }
};

require('fs').readdirSync(__dirname).forEach(function (fileName) {
    if (/\.js$/.test(fileName) && fileName !== 'index.js') {
        assets.register(fileName.replace(/\.js$/, ''), require('./' + fileName));
    }
});

_.extend(exports, assets);
