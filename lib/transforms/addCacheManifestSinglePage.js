var URL = require('url'),
    path = require('path'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations');

exports.addCacheManifestSinglePage = function addCacheManifestSinglePage() { // Query?
    return function (siteGraph, cb) {
        siteGraph.findAssets('isInitial', true).forEach(function (htmlAsset) {
            // Remove any existing manifests for htmlAsset:
            siteGraph.relations.filter(function (relation) {
                return relation.from === htmlAsset && relation.type === 'HTMLCacheManifest';
            }).forEach(function (existingManifest) {
                siteGraph.unregisterAsset(existingManifest, true); // cascade
            });

            var cacheManifest = new assets.CacheManifest({
                isDirty: true,
                parseTree: {} // Hmm, FIXME, "new" really means new here :)
            });

            if (htmlAsset.url) {
                cacheManifest.url = URL.resolve(htmlAsset.url, path.basename(htmlAsset.url, path.extname(htmlAsset.url)) + '.manifest');
            }

            // Find all assets that can be reached from the HTML file and add relations to them from the manifest:

            siteGraph.lookupSubgraph(htmlAsset, function (relation) {return true;}).assets.forEach(function (asset) {
                if (asset.url && asset !== htmlAsset) {
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
        });
        process.nextTick(cb);
    };
};
