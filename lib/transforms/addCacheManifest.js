var path = require('path'),
    _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    assets = require('../assets'),
    relations = require('../relations'),
    query = require('../query');

module.exports = function (queryObj) {
    return function addCacheManifestSinglePage(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            if (htmlAsset.isInline) {
                throw new Error("addCacheManifestSinglePage: Cannot generate a CacheManifest for an inline Html asset");
            }
            // Look for an existing manifests for htmlAsset:
            var manifest,
                existingManifestRelations = assetGraph.findRelations({
                    from: htmlAsset,
                    type: 'HtmlCacheManifest'
                });
            if (existingManifestRelations.length === 1) {
                manifest = existingManifestRelations[0].to;
            } else if (existingManifestRelations.length > 1) {
                throw new Error("addCacheManifestSinglePage: Assertion failure: " + htmlAsset + " has more than one cache manifest relation");
            } else {
                manifest = new assets.CacheManifest({
                    url: htmlAsset.url + assets.CacheManifest.prototype.defaultExtension,
                    isDirty: true,
                    parseTree: {
                        CACHE: [
                            {comment: ' ' + htmlAsset.url.replace(/.*\//, '') + ' @ ' + htmlAsset.md5Hex.substr(0, 10)}
                        ],
                        NETWORK: [
                            {tokens: ['*']}
                        ]
                    }
                });
                assetGraph.addAsset(manifest);
                new relations.HtmlCacheManifest({to: manifest}).attach(htmlAsset, 'first');
            }

            // Find all assets that can be reached from the Html file and add relations to them from the manifest:

            assetGraph.eachAssetPostOrder(htmlAsset, {type: query.not(['HtmlAnchor', 'HtmlCacheManifest'])}, function (asset, incomingRelation) {
                // But only if the asset isn't inline and isn't already in the manifest:
                if (!asset.isInline && asset !== htmlAsset && asset !== manifest && !assetGraph.findRelations({from: manifest, to: asset}).length) {
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
