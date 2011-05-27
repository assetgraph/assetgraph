var path = require('path'),
    error = require('../util/error'),
    assets = require('../assets'),
    relations = require('../relations'),
    query = require('../query');

module.exports = function (queryObj) {
    return function addCacheManifestSinglePage(assetGraph) {
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
                    parseTree: {}
                });
                if (htmlAsset.url) {
                    manifest.url = htmlAsset.url + manifest.defaultExtension;
                } else {
                    manifest.url = assetGraph.root + manifest.id + manifest.defaultExtension;
                }
                assetGraph.addAsset(manifest);
                assetGraph.attachAndAddRelation(new relations.HTMLCacheManifest({
                    from: htmlAsset,
                    to: manifest
                }));
            }

            // Find all assets that can be reached from the HTML file and add relations to them from the manifest:

            assetGraph.createSubgraph(htmlAsset).findAssets({url: query.isDefined}).forEach(function (asset) { // FIXME: Query
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
    };
};
