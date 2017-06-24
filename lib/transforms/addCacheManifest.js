const _ = require('lodash');
const AssetGraph = require('../AssetGraph');
const query = AssetGraph.query;

module.exports = queryObj => {
    return function addCacheManifest(assetGraph) {
        for (const htmlAsset of assetGraph.findAssets(_.extend({type: 'Html', isInline: false}, queryObj))) {
            // Look for an existing manifests for htmlAsset:
            let manifest;
            const existingManifestRelations = assetGraph.findRelations({
                from: htmlAsset,
                type: 'HtmlCacheManifest'
            });
            if (existingManifestRelations.length === 1) {
                manifest = existingManifestRelations[0].to;
            } else if (existingManifestRelations.length > 1) {
                throw new Error('addCacheManifestSinglePage: Assertion failure: ' + htmlAsset + ' has more than one cache manifest relation');
            } else {
                manifest = new assetGraph.CacheManifest({
                    url: htmlAsset.url.replace(/[?#].*$/, '').replace(/\.html$/, '') + AssetGraph.CacheManifest.prototype.defaultExtension,
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
                new AssetGraph.HtmlCacheManifest({to: manifest}).attach(htmlAsset, 'first');
            }

            // Find all assets that can be reached from the Html file and add relations to them from the manifest:

            assetGraph.eachAssetPostOrder(htmlAsset, {type: query.not(['HtmlAnchor', 'HtmlMetaRefresh', 'HtmlCacheManifest', 'HtmlConditionalComment', 'JavaScriptSourceUrl', 'JavaScriptSourceMappingUrl', 'JavaScriptSourceMap'])}, asset => {
                // But only if the asset isn't inline, has been loaded, and isn't already in the manifest:
                if (!asset.isInline && asset.isLoaded && asset !== htmlAsset && asset !== manifest && !assetGraph.findRelations({from: manifest, to: asset}).length) {
                    const existingManifestEntriesInCacheSection = assetGraph.findRelations({from: manifest, sectionName: 'CACHE'});
                    let position;
                    let adjacentRelation;

                    if (existingManifestEntriesInCacheSection.length === 0) {
                        position = 'first';
                    } else {
                        position = 'after';
                        adjacentRelation = existingManifestEntriesInCacheSection[existingManifestEntriesInCacheSection.length - 1];
                    }
                    new AssetGraph.CacheManifestEntry({
                        sectionName: 'CACHE',
                        to: asset
                    }).attach(manifest, position, adjacentRelation);
                }
            });
        }
    };
};
