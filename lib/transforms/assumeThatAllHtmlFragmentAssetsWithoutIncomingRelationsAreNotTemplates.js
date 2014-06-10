var _ = require('lodash');

module.exports = function (queryObj) {
    return function assumeThatAllHtmlFragmentAssetsWithoutIncomingRelationsAreNotTemplates(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html', isFragment: true}, queryObj)).forEach(function (htmlAsset) {
            if (htmlAsset.incomingRelations.length === 0) {
                htmlAsset.isFragment = false;
            }
        });
    };
};
