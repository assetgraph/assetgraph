const _ = require('lodash');

// https://github.com/One-com/assetgraph/issues/82

module.exports = queryObj => {
    return function removeDuplicateHtmlStyles(assetGraph) {
        for (const htmlAsset of assetGraph.findAssets(_.extend({type: 'Html'}, queryObj))) {
            const seenCssAssetsById = {};
            for (const htmlStyle of assetGraph.findRelations({from: htmlAsset, type: 'HtmlStyle'})) {
                if (seenCssAssetsById[htmlStyle.to.id]) {
                    htmlStyle.detach();
                } else {
                    seenCssAssetsById[htmlStyle.to.id] = true;
                }
            }
        }
    };
};
