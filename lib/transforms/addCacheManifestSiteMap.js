var URL = require('url'),
    path = require('path'),
    _ = require('underscore'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations'),
    fileUtils = require('../fileUtils');

exports.addCacheManifestSiteMap = function () {
    return function addCacheManifestSiteMap(siteGraph, cb) {
        var cacheManifest = new assets.CacheManifest({
            isDirty: true,
            parseTree: {} // Hmm, FIXME, "new" really means new here :)
        });

        cacheManifest.url = _.extend(siteGraph.root); // FIXME

        siteGraph.assets.forEach(function (asset) {
            if (asset.url) {
                siteGraph.attachAndRegisterRelation(new relations.CacheManifestEntry({
                    from: cacheManifest,
                    to: asset
                }));
            }
        });

        siteGraph.registerAsset(cacheManifest);

        siteGraph.findAssets('type', 'HTML').forEach(function (htmlAsset) {
            siteGraph.attachAndRegisterRelation(new relations.HTMLCacheManifest({
                from: htmlAsset,
                to: cacheManifest
            }));
        });

        process.nextTick(cb);
    };
};
