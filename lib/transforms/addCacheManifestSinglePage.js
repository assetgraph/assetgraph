var URL = require('url'),
    path = require('path'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations');

exports.addCacheManifestSinglePage = function () { // Query?
    return function addCacheManifestSinglePage(assetGraph, cb) {
        assetGraph.findAssets('isInitial', true).forEach(function (htmlAsset) {
            // Remove any existing manifests for htmlAsset:
            assetGraph.relations.filter(function (relation) {
                return relation.from === htmlAsset && relation.type === 'HTMLCacheManifest';
            }).forEach(function (existingManifest) {
                assetGraph.removeAsset(existingManifest, true); // cascade
            });

            var cacheManifest = new assets.CacheManifest({
                isDirty: true,
                parseTree: {} // Hmm, FIXME, "new" really means new here :)
            });

            if (htmlAsset.url) {
                cacheManifest.url = URL.resolve(htmlAsset.url, path.basename(htmlAsset.url, path.extname(htmlAsset.url)) + '.manifest');
            }

            // Find all assets that can be reached from the HTML file and add relations to them from the manifest:

            assetGraph.lookupSubgraph(htmlAsset, function (relation) {return true;}).assets.forEach(function (asset) {
                if (asset.url && asset !== htmlAsset) {
                    assetGraph.attachAndAddRelation(new relations.CacheManifestEntry({
                        from: cacheManifest,
                        to: asset
                    }));
                }
            });

            assetGraph.addAsset(cacheManifest);

            assetGraph.attachAndAddRelation(new relations.HTMLCacheManifest({
                from: htmlAsset,
                to: cacheManifest
            }));
        });
        process.nextTick(cb);
    };
};
