var URL = require('url'),
    path = require('path'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations');

exports.addCacheManifestSinglePage = function () { // Query?
    return function addCacheManifestSinglePage(assetGraph, cb) {
        assetGraph.findAssets('isInitial', true).forEach(function (htmlAsset) {
            // Look for an existing manifests for htmlAsset:
            var cacheManifest,
                existingManifestRelations = assetGraph.relations.filter(function (relation) {
                    return relation.from === htmlAsset && relation.type === 'HTMLCacheManifest';
                });
            if (existingManifestRelations.length === 1) {
                cacheManifest = existingManifestRelations[0].to;
            } else if (existingManifestRelations.length > 1) {
                cb(new Error("addCacheManifestSinglePage: Consistency error -- " + htmlAsset + " has more than one cache manifest relations"));
            } else {
                cacheManifest = new assets.CacheManifest({
                    isDirty: true,
                    parseTree: {} // Hmm, FIXME, "new" really means new here :)
                });
                if (htmlAsset.url) {
                    cacheManifest.url = URL.resolve(htmlAsset.url, path.basename(htmlAsset.url, path.extname(htmlAsset.url)) + '.manifest');
                }
                assetGraph.addAsset(cacheManifest);
                assetGraph.attachAndAddRelation(new relations.HTMLCacheManifest({
                    from: htmlAsset,
                    to: cacheManifest
                }));
            }

            // Find all assets that can be reached from the HTML file and add relations to them from the manifest:

            assetGraph.lookupSubgraph(htmlAsset, function (relation) {return true;}).assets.forEach(function (asset) {
                // But only if the asset isn't inline and isn't already in the manifest:
                if (asset.url && asset !== htmlAsset && asset !== cacheManifest && !assetGraph.findRelations('to', asset).some(function (relation) {return relation.from === cacheManifest;})) {
                    assetGraph.attachAndAddRelation(new relations.CacheManifestEntry({
                        from: cacheManifest,
                        to: asset
                    }));
                }
            });
        });
        process.nextTick(cb);
    };
};
