var _ = require('lodash'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    return function inlineAngularJsTemplates(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html', isInline: false, isFragment: false}, queryObj)).forEach(function (htmlAsset) {
            var relationsToInline = [];
            assetGraph.eachAssetPreOrder(htmlAsset, {type: assetGraph.query.not(['HtmlAnchor', 'HtmlMetaRefresh'])}, function (asset) {
                if (asset.type === 'JavaScript') {
                    Array.prototype.push.apply(relationsToInline, assetGraph.findRelations({from: asset, type: 'JavaScriptAngularJsTemplate', to: {isLoaded: true, isInline: false}}));
                    Array.prototype.push.apply(relationsToInline, assetGraph.findRelations({from: asset, type: 'JavaScriptAngularJsTemplateCacheAssignment', to: {isLoaded: true}}));
                }
            });
            var alreadyInlinedById = {};
            assetGraph.findRelations({from: htmlAsset, type: 'HtmlInlineScriptTemplate'}).forEach(function (htmlInlineScriptTemplate) {
                var id = htmlInlineScriptTemplate.node.getAttribute('id');
                if (id) {
                    alreadyInlinedById[id] = true;
                }
            });
            var document = htmlAsset.parseTree,
                inlinedTemplateAssets = [];
            relationsToInline.forEach(function (relationToInline) {
                var id;
                if (relationToInline.type === 'JavaScriptAngularJsTemplateCacheAssignment') {
                    id = relationToInline.node.expression.arguments[0].value; // id is first argument to the 'put' function
                    relationToInline.detach();
                } else {
                    id = relationToInline.href;
                    relationToInline.remove();
                }
                if (!alreadyInlinedById[id]) {
                    inlinedTemplateAssets.push(relationToInline.to);
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
            // Template assets that had more than one incoming relation to begin with will
            // be cloned in the .inline() call above. Remove the template assets that have
            // become orphans:
            inlinedTemplateAssets.forEach(function (templateAsset) {
                if (templateAsset.incomingRelations.length === 0) {
                    assetGraph.removeAsset(templateAsset);
                }
            });
        });
    };
};
