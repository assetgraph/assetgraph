var crypto = require('crypto'),
    _ = require('underscore'),
    seq = require('seq'),
    query = require('../query');

// Note: Will implicitly un-inline assets found to be identical. If you want to prevent this from happening,
// specify url:query.isDefined or similar in the queryObj.
module.exports = function (queryObj) {
    return function mergeIdenticalAssets(assetGraph, cb) {
        seq(assetGraph.findAssets(queryObj))
            .parEach(20, function (asset) {
                assetGraph.getSerializedAsset(asset, this.into(asset.id));
            })
            .unflatten()
            .seq(function (allAssets) {
                var seenAssetsByMd5 = {};
                allAssets.forEach(function (asset) {
                    var rawSrc = this.vars[asset.id],
                        md5sum = crypto.createHash('md5').update(rawSrc).digest('hex');
                    if (md5sum in seenAssetsByMd5) {
                        var identicalAsset = seenAssetsByMd5[md5sum];
                        if (!identicalAsset.url) {
                            // Un-inline the identical asset so that the two can be merged:
                            assetGraph.setAssetUrl(identicalAsset, assetGraph.root + identicalAsset.id + identicalAsset.getExtension());
                        }
                        assetGraph.findRelations({to: asset}).forEach(function (incomingRelation) {
                            assetGraph.updateRelationTarget(incomingRelation, identicalAsset);
                        });
                        assetGraph.removeAsset(asset);
                    } else {
                        seenAssetsByMd5[md5sum] = asset;
                    }
                }, this);
                cb();
            })
            ['catch'](cb);
    };
};
