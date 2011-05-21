/*global exports, require*/
var _ = require('underscore'),
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
            return 'XML';
        } else if (/^text\//i.test(contentType)) {
            return 'Text';
        } else {
            return 'Base';
        }
    }
};

assets.create = function (assetConfig) {
    if (!assetConfig.type) {
        throw new Error("assets.create: No type provided in assetConfig");
    }
    return new assets[assetConfig.type](assetConfig);
};

require('fs').readdirSync(__dirname).forEach(function (fileName) {
    if (/\.js$/.test(fileName) && fileName !== 'index.js') {
        assets.register(fileName.replace(/\.js$/, ''), require('./' + fileName));
    }
});

_.extend(exports, assets);
