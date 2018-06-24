const AssetGraph = require('../AssetGraph');

module.exports = queryObj => {
  return function addCacheManifest(assetGraph) {
    for (const htmlAsset of assetGraph.findAssets(
      Object.assign({ type: 'Html', isInline: false }, queryObj)
    )) {
      // Look for an existing manifests for htmlAsset:
      let manifest;
      const existingManifestRelations = assetGraph.findRelations({
        from: htmlAsset,
        type: 'HtmlCacheManifest'
      });
      if (existingManifestRelations.length === 1) {
        manifest = existingManifestRelations[0].to;
      } else if (existingManifestRelations.length > 1) {
        throw new Error(
          `addCacheManifestSinglePage: Assertion failure: ${htmlAsset} has more than one cache manifest relation`
        );
      } else {
        manifest = assetGraph.addAsset({
          type: 'CacheManifest',
          url:
            htmlAsset.url.replace(/[?#].*$/, '').replace(/\.html$/, '') +
            AssetGraph.CacheManifest.prototype.defaultExtension,
          isDirty: true,
          parseTree: {
            CACHE: [
              {
                comment: ` ${htmlAsset.url.replace(
                  /.*\//,
                  ''
                )} @ ${htmlAsset.md5Hex.substr(0, 10)}`
              }
            ],
            NETWORK: [{ tokens: ['*'] }]
          }
        });
        htmlAsset.addRelation(
          {
            type: 'HtmlCacheManifest',
            to: manifest
          },
          'first'
        );
      }

      // Find all assets that can be reached from the Html file and add relations to them from the manifest:

      assetGraph.eachAssetPostOrder(
        htmlAsset,
        {
          type: {
            $nin: [
              'HtmlAnchor',
              'HtmlMetaRefresh',
              'HtmlCacheManifest',
              'HtmlConditionalComment',
              'JavaScriptSourceUrl',
              'JavaScriptSourceMappingUrl',
              'JavaScriptSourceMap'
            ]
          }
        },
        asset => {
          // But only if the asset isn't inline, has been loaded, and isn't already in the manifest:
          if (
            !asset.isInline &&
            asset.isLoaded &&
            asset !== htmlAsset &&
            asset !== manifest &&
            !assetGraph.findRelations({ from: manifest, to: asset }).length
          ) {
            const existingManifestEntriesInCacheSection = assetGraph.findRelations(
              { from: manifest, sectionName: 'CACHE' }
            );
            let position;
            let adjacentRelation;

            if (existingManifestEntriesInCacheSection.length === 0) {
              position = 'first';
            } else {
              position = 'after';
              adjacentRelation =
                existingManifestEntriesInCacheSection[
                  existingManifestEntriesInCacheSection.length - 1
                ];
            }
            manifest.addRelation(
              {
                type: 'CacheManifestEntry',
                sectionName: 'CACHE',
                to: asset
              },
              position,
              adjacentRelation
            );
          }
        }
      );
    }
  };
};
