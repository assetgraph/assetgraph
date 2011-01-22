var path = require('path'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations'),
    fileUtils = require('../fileUtils');

exports.addCacheManifest = function addCacheManifest(siteGraph, htmlAsset, cb) {
    // Remove any existing manifests for htmlAsset:
    siteGraph.relations.filter(function (relation) {
        return relation.from === htmlAsset && relation.type === 'HTMLCacheManifest';
    }).forEach(function (existingManifest) {
        siteGraph.unregisterAsset(existingManifest, true); // cascade
    });

    var cacheManifest = new assets.CacheManifest({
        dirty: true,
        baseUrl: htmlAsset.baseUrl,
        url: htmlAsset.url.replace(/\.html$/, '.manifest'), // FIXME
        parseTree: {}
    });

    siteGraph.lookupSubgraph(htmlAsset, function (relation) {return true;}).assets.forEach(function (asset) {
        if (siteGraph.findRelations('to', asset).some(function (incomingRelation) {return !incomingRelation.isInline;})) {
            siteGraph.attachAndRegisterRelation(new relations.CacheManifestEntry({
                from: cacheManifest,
                to: asset
            }));
        }
    });

    siteGraph.registerAsset(cacheManifest);

    siteGraph.attachAndRegisterRelation(new relations.HTMLCacheManifest({
        from: htmlAsset,
        to: cacheManifest
    }));

    process.nextTick(function () {
        cb(null, siteGraph);
    });
};
