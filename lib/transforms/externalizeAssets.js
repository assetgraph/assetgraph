var crypto = require('crypto'),
    _ = require('underscore'),
    seq = require('seq'),
    query = require('../query'),
    fileUtils = require('../fileUtils');

module.exports = function (queryObj) {
    return function externalizeAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq().
            extend(assetGraph.findAssets(_.extend({url: query.undefined}, queryObj))).
            parEach(20, function (asset) {
                assetGraph.getAssetText(asset, this.into("" + asset.id));
            }).
            seq(function () {
                var seenAssetsByMD5 = {};
                this.stack.forEach(function (asset) {
                    var md5sum = crypto.createHash('md5').update(this.vars[asset.id]).digest('hex');
                    if (md5sum in seenAssetsByMD5) {
                        var identicalAsset = seenAssetsByMD5[md5sum];
                        assetGraph.findRelations({to: asset}).forEach(function (incomingRelation) {
                            assetGraph.removeRelation(incomingRelation);
                            incomingRelation.to = identicalAsset;
                            assetGraph.addRelation(incomingRelation);
                            // FIXME: AssetGraph should provide a helper method for this:
                            assetGraph._setRawUrlStringOfRelation(incomingRelation, fileUtils.buildRelativeUrl(assetGraph.getBaseAssetForRelation(incomingRelation).url, identicalAsset));
                        });
                        assetGraph.removeAsset(asset, true); // Cascade to get rid of the outgoing relations
                    } else {
                        seenAssetsByMD5[md5sum] = asset;
                        assetGraph.setAssetUrl(asset, assetGraph.resolver.root + asset.id + '.' + asset.defaultExtension);
                    }
                }, this);
                process.nextTick(cb);
            });
    };
};
