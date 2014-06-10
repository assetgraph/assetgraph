// The purpose of this transform is to make Html fragment assets (no <html> tag) that
// were initially in an AssetGraph to be wired up correctly after their incoming
// relations have been discovered.

var _  = require('lodash');

module.exports = function (queryObj) {
    queryObj = queryObj || {type: 'Html', isFragment: true};
    return function fixBaseAssetsOfUnresolvedOutgoingRelationsFromHtmlFragments(assetGraph) {
        assetGraph.findRelations({from: _.extend({type: 'Html', isFragment: true}, queryObj)}, true).forEach(function (relation) {
            if (relation._baseAssetPath === null) {
                delete relation._baseAssetPath;
                var index =  assetGraph._relationsWithNoBaseAsset.indexOf(relation);
                if (index !== -1) {
                    assetGraph._relationsWithNoBaseAsset.splice(index, 1);
                }
            }
        });
    };
};
