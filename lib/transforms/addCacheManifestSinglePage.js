var URL = require('url'),
    path = require('path'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations'),
    query = require('../query');

exports.addCacheManifestSinglePage = function (queryObj) {
    return function addCacheManifestSinglePage(assetGraph, cb) {
        assetGraph.findAssets(queryObj).forEach(function (htmlAsset) {
            // Look for an existing manifests for htmlAsset:
            var manifest,
                existingManifestRelations = assetGraph.findRelations({
                    from: htmlAsset,
                    type: 'HTMLCacheManifest'
                });
            if (existingManifestRelations.length === 1) {
                manifest = existingManifestRelations[0].to;
            } else if (existingManifestRelations.length > 1) {
                cb(new Error("addCacheManifestSinglePage: Consistency error -- " + htmlAsset + " has more than one cache manifest relation"));
            } else {
                manifest = new assets.CacheManifest({
                    isDirty: true,
                    parseTree: {} // Hmm, FIXME, "new" really means new here :)
                });
                if (htmlAsset.url) {
                    manifest.url = URL.resolve(htmlAsset.url, path.basename(htmlAsset.url, path.extname(htmlAsset.url)) + '.manifest');
                }
                assetGraph.addAsset(manifest);
                assetGraph.attachAndAddRelation(new relations.HTMLCacheManifest({
                    from: htmlAsset,
                    to: manifest
                }));
            }

            // Find all assets that can be reached from the HTML file and add relations to them from the manifest:

            assetGraph.createSubgraph(htmlAsset).findAssets({url: query.defined}).forEach(function (asset) { // FIXME: Query
                // But only if the asset isn't inline and isn't already in the manifest:
                if (asset !== htmlAsset && asset !== manifest && !assetGraph.findRelations({from: manifest, to: asset}).length) {
                    assetGraph.attachAndAddRelation(new relations.CacheManifestEntry({
                        sectionName: 'CACHE',
                        from: manifest,
                        to: asset
                    }));
                }
            });
        });
        process.nextTick(cb);
    };
};
