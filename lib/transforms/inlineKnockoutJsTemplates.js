var _ = require('underscore');

module.exports = function (queryObj) {
    return function inlineKnockoutJsTemplates(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html', isInline: false, isFragment: false}, queryObj)).forEach(function (htmlAsset) {
            var relationsToInline = [];
            assetGraph.eachAssetPreOrder(htmlAsset, {type: assetGraph.query.not('HtmlAnchor')}, function (asset) {
                if (asset.type === 'JavaScript') {
                    Array.prototype.push.apply(relationsToInline, assetGraph.findRelations({
                        from: asset,
                        type: assetGraph.query.not(['JavaScriptGetText', 'JavaScriptAngularJsTemplate', 'JavaScriptAngularJsCacheAssignment', 'JavaScriptTrHtml']),
                        to: {type: 'Html', isInline: false}
                    }));
                } else if (asset.type === 'Html' && asset.isFragment) {
                    Array.prototype.push.apply(relationsToInline, assetGraph.findRelations({
                        from: asset,
                        type: 'HtmlInlineScriptTemplate'
                    }));
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
                if (relationToInline.type === 'HtmlInlineScriptTemplate') {
                    id = relationToInline.node.getAttribute('id');
                } else {
                    id = relationToInline.to.url.split('/').pop().replace(/\.ko$/, '');
                }
                relationToInline.detach();
                if (!alreadyInlinedById[id]) {
                    inlinedTemplateAssets.push(relationToInline.to);
                    var node = document.createElement('script');
                    node.setAttribute('type', 'text/html');
                    node.setAttribute('id', id);
                    document.body.appendChild(node);
                    var htmlInlineScriptTemplate = new assetGraph.HtmlInlineScriptTemplate({
                        from: htmlAsset,
                        to: relationToInline.to,
                        node: node
                    });
                    assetGraph.addRelation(htmlInlineScriptTemplate);
                    htmlInlineScriptTemplate.inline();
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
