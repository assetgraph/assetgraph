var _ = require('lodash'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    return function convertCssImportsToHtmlStyles(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset}).forEach(function (htmlStyle) {
                assetGraph.eachAssetPostOrder(htmlStyle, {type: 'CssImport'}, function (cssAsset, incomingRelation) {
                    if (incomingRelation.type === 'CssImport') {
                        var newHtmlStyle = new AssetGraph.HtmlStyle({to: cssAsset, hrefType: incomingRelation.hrefType});
                        newHtmlStyle.attach(htmlAsset, 'before', htmlStyle);
                        var media = incomingRelation.media;
                        if (media.length) {
                            newHtmlStyle.node.setAttribute('media', media);
                        }
                        incomingRelation.detach();
                    }
                });
            });
        });
    };
};
