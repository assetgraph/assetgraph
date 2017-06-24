const _ = require('lodash');
const AssetGraph = require('../AssetGraph');

module.exports = queryObj => {
    return function convertCssImportsToHtmlStyles(assetGraph) {
        for (const htmlAsset of assetGraph.findAssets(_.extend({type: 'Html'}, queryObj))) {
            for (const htmlStyle of assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset})) {
                assetGraph.eachAssetPostOrder(htmlStyle, {type: 'CssImport'}, (cssAsset, incomingRelation) => {
                    if (incomingRelation.type === 'CssImport') {
                        const newHtmlStyle = new AssetGraph.HtmlStyle({to: cssAsset, hrefType: incomingRelation.hrefType});
                        newHtmlStyle.attach(htmlAsset, 'before', htmlStyle);
                        const media = incomingRelation.media;
                        if (media.length) {
                            newHtmlStyle.node.setAttribute('media', media);
                        }
                        incomingRelation.detach();
                    }
                });
            }
        }
    };
};
