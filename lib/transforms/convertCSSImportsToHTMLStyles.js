var _ = require('underscore'),
    seq = require('seq'),
    relations = require('../relations'),
    traversal = require('../traversal');

module.exports = function (queryObj) {
    return function convertCSSImportsToHTMLStyles(assetGraph, cb) {
        assetGraph.findAssets(_.extend({type: 'HTML'}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({type: 'HTMLStyle', from: htmlAsset}).forEach(function (htmlStyle) {
                traversal.eachAssetPostOrder(assetGraph, htmlStyle, {type: 'CSSImport'}, function (cssAsset, incomingRelation) {
                    if (incomingRelation.type === 'CSSImport') {
                        var newHTMLStyle = new relations.HTMLStyle({
                            from: htmlAsset,
                            to: cssAsset
                        });
                        assetGraph.attachAndAddRelation(newHTMLStyle, 'before', htmlStyle);
                        if (incomingRelation.cssRule.media.length) {
                            newHTMLStyle.node.setAttribute('media', incomingRelation.cssRule.media.mediaText);
                        }
                        assetGraph.detachAndRemoveRelation(incomingRelation);
                    }
                });
            });
        });
        process.nextTick(cb);
    };
};
