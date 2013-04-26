var _ = require('underscore');

module.exports = function (queryObj) {
    return function removeUnreferencedAssets(assetGraph) {
        var assets = assetGraph.findAssets(_.extend({isInline: false}, queryObj)),
            numRemoved;
        do {
            numRemoved = 0;
            for (var i = 0 ; i < assets.length ; i += 1) {
                var asset = assets[i];
                if (assetGraph.findRelations({to: asset}).length === 0) {
                    assetGraph.removeAsset(asset);
                    assets.splice(i, 1);
                    i -= 1;
                    numRemoved += 1;
                }
            }
        } while (numRemoved !== 0);
    };
};
