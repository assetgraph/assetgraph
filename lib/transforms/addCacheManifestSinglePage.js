var path = require('path'),
    urlTools = require('../util/urlTools'),
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
                    type: 'HtmlCacheManifest'
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
                    manifest.url = urlTools.resolveUrl(assetGraph.root, manifest.id + manifest.defaultExtension);
                }
                assetGraph.addAsset(manifest);
                new relations.HtmlCacheManifest({to: manifest}).attach(htmlAsset, 'first');
            }

            // Find all assets that can be reached from the Html file and add relations to them from the manifest:

            assetGraph.collectAssetsPostOrder(htmlAsset).forEach(function (asset) {
                // Ignore inline assets
                if (!asset.url) {
                    return;
                }
                // But only if the asset isn't inline and isn't already in the manifest:
                if (asset !== htmlAsset && asset !== manifest && !assetGraph.findRelations({from: manifest, to: asset}).length) {
                    var existingManifestEntriesInCacheSection = assetGraph.findRelations({from: manifest, sectionName: 'CACHE'}),
                        position,
                        adjacentRelation;

                    if (existingManifestEntriesInCacheSection.length === 0) {
                        position = 'first';
                    } else {
                        position = 'after';
                        adjacentRelation = existingManifestEntriesInCacheSection[existingManifestEntriesInCacheSection.length - 1];
                    }

                    new relations.CacheManifestEntry({
                        sectionName: 'CACHE',
                        to: asset
                    }).attach(manifest, position, adjacentRelation);
                }
            });
        });
    };
};
