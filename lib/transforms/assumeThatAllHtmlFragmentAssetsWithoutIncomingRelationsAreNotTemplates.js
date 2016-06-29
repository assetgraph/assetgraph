var _ = require('lodash');

module.exports = function (queryObj) {
    return function assumeThatAllHtmlFragmentAssetsWithoutIncomingRelationsAreNotTemplates(assetGraph) {
        var recomputeBaseAssets = false;
        assetGraph.findAssets(_.extend({type: 'Html', isFragment: true}, queryObj)).forEach(function (htmlAsset) {
            if (htmlAsset.incomingRelations.length === 0) {
                recomputeBaseAssets = true;
                htmlAsset.isFragment = false;
            }
        });
        if (recomputeBaseAssets) {
            assetGraph.recomputeBaseAssets(true);
        }
    };
};
