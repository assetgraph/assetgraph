var URL = require('url'),
    path = require('path'),
    _ = require('underscore'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations'),
    fileUtils = require('../fileUtils');

exports.addCacheManifestSiteMap = function () {
    return function addCacheManifestSiteMap(assetGraph, cb) {
        var cacheManifest = new assets.CacheManifest({
            isDirty: true,
            parseTree: {} // Hmm, FIXME, "new" really means new here :)
        });

        cacheManifest.url = _.extend(assetGraph.root); // FIXME

        assetGraph.assets.forEach(function (asset) {
            if (asset.url) {
                assetGraph.attachAndRegisterRelation(new relations.CacheManifestEntry({
                    from: cacheManifest,
                    to: asset
                }));
            }
        });

        assetGraph.registerAsset(cacheManifest);

        assetGraph.findAssets('type', 'HTML').forEach(function (htmlAsset) {
            assetGraph.attachAndRegisterRelation(new relations.HTMLCacheManifest({
                from: htmlAsset,
                to: cacheManifest
            }));
        });

        process.nextTick(cb);
    };
};
