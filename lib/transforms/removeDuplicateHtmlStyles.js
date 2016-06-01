var _ = require('lodash');

// https://github.com/One-com/assetgraph/issues/82

module.exports = function (queryObj) {
    return function removeDuplicateHtmlStyles(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            var seenCssAssetsById = {};
            assetGraph.findRelations({from: htmlAsset, type: 'HtmlStyle'}).forEach(function (htmlStyle) {
                if (seenCssAssetsById[htmlStyle.to.id]) {
                    htmlStyle.detach();
                } else {
                    seenCssAssetsById[htmlStyle.to.id] = true;
                }
            });
        });
    };
};
