var _ = require('underscore'),
    AssetGraph = require('../AssetGraph');

module.exports = function (queryObj) {
    return function inlineAngularJsTemplates(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html', isInline: false}, queryObj)).forEach(function (htmlAsset) {
            var relationsToInline = [];
            assetGraph.eachAssetPreOrder(htmlAsset, {type: assetGraph.query.not('HtmlAnchor')}, function (asset) {
                if (asset.type === 'JavaScript') {
                    Array.prototype.push.apply(relationsToInline, assetGraph.findRelations({from: asset, type: 'JavaScriptAngularJsTemplate', to: {isLoaded: true, isInline: false}}));
                    Array.prototype.push.apply(relationsToInline, assetGraph.findRelations({from: asset, type: 'JavaScriptAngularJsTemplateCacheAssignment'}));
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
            relationsToInline.forEach(function (relationToInline) {
                var id;
                if (relationToInline.type === 'JavaScriptAngularJsTemplateCacheAssignment') {
                    id = relationToInline.node[1][2][0][1]; // id is first argument to the 'put' function
                    relationToInline.detach();
                } else {
                    id = relationToInline.href;
                }
                if (!alreadyInlinedById[id]) {
                    var node = document.createElement('script');
                    node.setAttribute('type', 'text/ng-template');
                    node.setAttribute('id', id);
                    document.body.appendChild(node);
                    var htmlInlineScriptTemplate = new AssetGraph.HtmlInlineScriptTemplate({
                        from: htmlAsset,
                        to: relationToInline.to,
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
