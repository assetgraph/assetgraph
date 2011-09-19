var _ = require('underscore'),
    urlTools = require('../util/urlTools');

// Note: Will implicitly un-inline assets found to be identical. If you want to prevent this from happening,
// specify isInline:false or similar in the queryObj.
module.exports = function (queryObj) {
    return function mergeIdenticalAssets(assetGraph) {
        var seenAssetsByMd5 = {};
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            var md5Hex = asset.md5Hex;
            if (md5Hex in seenAssetsByMd5) {
                var identicalAsset = seenAssetsByMd5[md5Hex];
                if (!identicalAsset.url) {
                    // Un-inline the identical asset so that the two can be merged:
                    identicalAsset.url = urlTools.resolveUrl(assetGraph.root, identicalAsset.id + identicalAsset.extension);
                }
                assetGraph.findRelations({to: asset}).forEach(function (incomingRelation) {
                    incomingRelation.to = identicalAsset;
                    incomingRelation.refreshHref();
                });
                assetGraph.removeAsset(asset);
            } else {
                seenAssetsByMd5[md5Hex] = asset;
            }
        });
    };
};
