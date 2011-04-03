/*global exports, require*/
var _ = require('underscore'),
    assets = {
        typeByExtension: {},
        typeByContentType: {},
        lookupContentType: function (contentType) {
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
        }
    };

['Base', 'Text',
 'JavaScript', 'HTML', 'CSS', 'HTC',
 'PNG', 'GIF', 'JPEG', 'ICO',
 'CacheManifest',
 'JSON', 'XML',
 'Atom', 'RSS',
 'I18N'].forEach(function (assetType) {
    var Constructor = require('./' + assetType),
        prototype = Constructor.prototype;
    prototype.type = assetType;
    assets[assetType] = Constructor;
    if (prototype.contentType && !(prototype.contentType in assets.typeByContentType)) {
        assets.typeByContentType[prototype.contentType] = assetType;
    }
    if (prototype.defaultExtension) {
        assets.typeByExtension[prototype.defaultExtension] = assetType;
        assets.typeByExtension['.' + prototype.defaultExtension] = assetType; // Support path.extname
    }
    if (prototype.alternativeExtensions) {
        prototype.alternativeExtensions.forEach(function (alternativeExtension) {
            assets.typeByExtension[alternativeExtension] = assetType;
            assets.typeByExtension['.' + alternativeExtension] = assetType;
        });
    }
});

assets.create = function (assetConfig) {
    if (!assetConfig.type) {
        throw new Error("assets.create: No type provided in assetConfig");
    }
    return new assets[assetConfig.type](assetConfig);
};

_.extend(exports, assets);
