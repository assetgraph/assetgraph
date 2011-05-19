var crypto = require('crypto'),
    _ = require('underscore'),
    seq = require('seq'),
    query = require('../query');

// Note: Will implicitly un-inline assets found to be identical. If you want to prevent this from happening,
// specify url:query.defined or similar in the queryObj.
module.exports = function (queryObj) {
    return function mergeIdenticalAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq.ap(assetGraph.findAssets(queryObj))
            .parEach(20, function (asset) {
                assetGraph.getAssetMD5Hex(asset, this.into(asset.id));
            })
            .seq(function () {
                var seenAssetsByMD5 = {};
                this.stack.forEach(function (asset) {
                    var md5sum = this.vars[asset.id];
                    if (md5sum in seenAssetsByMD5) {
                        var identicalAsset = seenAssetsByMD5[md5sum];
                        if (!identicalAsset.url) {
                            // Un-inline the identical asset so that the two can be merged:
                            assetGraph.setAssetUrl(identicalAsset, assetGraph.resolver.root + identicalAsset.id + '.' + identicalAsset.defaultExtension);
                        }
                        assetGraph.findRelations({to: asset}).forEach(function (incomingRelation) {
                            assetGraph.updateRelationTarget(incomingRelation, identicalAsset);
                        });
                        assetGraph.removeAsset(asset);
                    } else {
                        seenAssetsByMD5[md5sum] = asset;
                    }
                }, this);
                process.nextTick(cb);
            })
            ['catch'](cb);
    };
};
