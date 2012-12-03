var _ = require('underscore'),
    relations = require('../relations');

module.exports = function (queryObj) {
    return function (assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html', isInline: false}, queryObj)).forEach(function (htmlAsset) {
            var javaScriptAngularJsTemplateRelationsToInline = [];
            assetGraph.eachAssetPreOrder(htmlAsset, {type: assetGraph.constructor.query.not('HtmlAnchor')}, function (asset) {
                if (asset.type === 'JavaScript') {
                    Array.prototype.push.apply(javaScriptAngularJsTemplateRelationsToInline, assetGraph.findRelations({from: asset, type: 'JavaScriptAngularJsTemplate', to: {isLoaded: true}}));
                }
            });
            var alreadyInlinedById = {};
            assetGraph.findRelations({from: htmlAsset, type: 'HtmlInlineScriptTemplate'}).forEach(function (htmlInlineScriptTemplate) {
                var id = htmlInlineScriptTemplate.node.getAttribute('id');
                if (id) {
                    alreadyInlinedById[id] = true;
                }
            });
            var document = htmlAsset.parseTree;
            javaScriptAngularJsTemplateRelationsToInline.forEach(function (javaScriptAngularJsTemplateRelation) {
                var id = javaScriptAngularJsTemplateRelation.href;
                if (!alreadyInlinedById[id]) {
                    var node = document.createElement('script');
                    node.setAttribute('type', 'text/ng-template');
                    node.setAttribute('id', id);
                    document.body.appendChild(node);
                    var htmlInlineScriptTemplate = new relations.HtmlInlineScriptTemplate({
                        from: htmlAsset,
                        to: javaScriptAngularJsTemplateRelation.to,
                        node: node
                    });
                    assetGraph.addRelation(htmlInlineScriptTemplate);
                    htmlInlineScriptTemplate.inline();
                    htmlAsset.markDirty();
                    alreadyInlinedById[id] = true;
                }
            });
        });
    };
};
