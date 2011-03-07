/*global exports, require*/
var _ = require('underscore'),
    assets = {
        typeByExtension: {},
        typeByContentType: {}
    };

['JavaScript', 'HTML', 'CSS', 'HTC',
 'PNG', 'GIF', 'JPEG', 'ICO',
 'CacheManifest',
 'Atom', 'RSS',
 'JSON', 'XML',
 'SpriteConfiguration'].forEach(function (assetType) {

    var Constructor = require('./' + assetType)[assetType],
        prototype = Constructor.prototype;
    prototype.type = assetType;
    assets[assetType] = Constructor;
    if (prototype.contentType) {
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
