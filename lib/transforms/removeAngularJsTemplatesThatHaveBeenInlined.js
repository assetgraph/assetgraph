// Inlined Angular.js templates referred to using the templateUrl: '...'
// syntax reappear in the graph when the JavaScript asset is
// compressed or cloned because the url is still valid. This transform
// removes those reappeared assets from the graph. Hopefully a better
// idea will come up.

var _ = require('underscore');

module.exports = function (queryObj) {
    return function removeAngularJsTemplatesThatHaveBeenInlined(assetGraph) {
        assetGraph.findAssets(_.extend({isInitial: true, type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            var document = htmlAsset.parseTree;
            assetGraph.eachAssetPreOrder(htmlAsset, {type: assetGraph.query.not('HtmlAnchor')}, function (asset) {
                if (asset.type === 'JavaScript') {
                    assetGraph.findRelations({from: asset, type: 'JavaScriptAngularJsTemplate', to: {isInline: false}}).forEach(function (javaScriptAngularJsTemplate) {
                        if (document.getElementById(javaScriptAngularJsTemplate.href)) {
                            assetGraph.removeRelation(javaScriptAngularJsTemplate);
                            assetGraph.removeAsset(javaScriptAngularJsTemplate.to);
                        }
                    });
                }
            });
        });
    };
};
