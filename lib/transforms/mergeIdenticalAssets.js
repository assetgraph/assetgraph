var crypto = require('crypto'),
    _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    query = require('../query');

// Note: Will implicitly un-inline assets found to be identical. If you want to prevent this from happening,
// specify url:query.isDefined or similar in the queryObj.
module.exports = function (queryObj) {
    return function mergeIdenticalAssets(assetGraph) {
        var seenAssetsByMd5 = {};
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            var md5sum = crypto.createHash('md5').update(asset.rawSrc).digest('hex');
            if (md5sum in seenAssetsByMd5) {
                var identicalAsset = seenAssetsByMd5[md5sum];
                if (!identicalAsset.url) {
                    // Un-inline the identical asset so that the two can be merged:
                    identicalAsset.url = urlTools.resolveUrl(assetGraph.root, identicalAsset.id + identicalAsset.extension);
                }
                assetGraph.findRelations({to: asset}).forEach(function (incomingRelation) {
                    assetGraph.updateRelationTarget(incomingRelation, identicalAsset);
                });
                assetGraph.removeAsset(asset);
            } else {
                seenAssetsByMd5[md5sum] = asset;
            }
        });
    };
};
