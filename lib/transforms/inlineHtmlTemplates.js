var _ = require('lodash');

module.exports = function (queryObj) {
    return function inlineHtmlTemplates(assetGraph) {
        var relationsToDetachById = {};
        var potentiallyOrphanedAssetsById = {};

        assetGraph.findAssets(_.extend({type: 'Html', isInline: false, isFragment: false}, queryObj)).forEach(function (htmlAsset) {
            var assetsBySeenIdAttribute = {},
                relationsToInline = [];
            assetGraph.eachAssetPostOrder(htmlAsset, {type: assetGraph.query.not(['HtmlAnchor', 'HtmlMetaRefresh'])}, function (asset) {
                if (asset.type === 'JavaScript') {
                    Array.prototype.push.apply(relationsToInline, assetGraph.findRelations({
                        from: asset,
                        type: assetGraph.query.not(['JavaScriptGetText', 'JavaScriptTrHtml']),
                        to: {
                            type: 'Html',
                            extension: '.ko',
                            isInline: false,
                            isLoaded: true
                        }
                    }));
                } else if (asset.type === 'Html' && asset.nonInlineAncestor.extension === '.ko' && asset.isFragment) {
                    Array.prototype.push.apply(relationsToInline, assetGraph.findRelations({
                        from: asset,
                        type: 'HtmlInlineScriptTemplate',
                        to: {
                            isLoaded: true
                        }
                    }));
                    if (asset.isLoaded) {
                        _.toArray(asset.parseTree.getElementsByTagName('*')).forEach(function (element) {
                            if (element.hasAttribute('id') && !relationsToInline.some(function (relationToInline) {
                                return relationToInline.node === element;
                            })) {
                                var id = element.getAttribute('id');
                                if (id) {
                                    (assetsBySeenIdAttribute[id] = assetsBySeenIdAttribute[id] || []).push(asset);
                                }
                            }
                        });
                    }
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
                relationsToDetachById[relationToInline.id] = relationToInline;
                var id;
                if (relationToInline.type === 'HtmlInlineScriptTemplate') {
                    id = relationToInline.node.getAttribute('id');
                } else {
                    id = relationToInline.to.url.split('/').pop().replace(/\..*$/, ''); // Strip .ko or .<localeId>.ko extension
                }
                var existingAttributes = relationToInline.type === 'HtmlInlineScriptTemplate' && relationToInline.node.attributes;
                if (!id || !alreadyInlinedById[id]) {
                    if (id && assetsBySeenIdAttribute[id]) {
                        assetGraph.emit('warn', new Error('inlineTemplates: Inlining ' + relationToInline.to.urlOrDescription +
                                                      ' into a <script> in ' + htmlAsset.urlOrDescription +
                                                          ' with an id attribute of ' + id + ', which already exists in these assets:\n  ' +
                                                          _.map(assetsBySeenIdAttribute[id], 'urlOrDescription').join('\n  ')));
                    }
                    potentiallyOrphanedAssetsById[relationToInline.to.id] = relationToInline.to;
                    var node = document.createElement('script');
                    node.setAttribute('type', 'text/html');
                    if (id) {
                        node.setAttribute('id', id);
                    }
                    if (existingAttributes) {
                        for (var i = 0 ; i < existingAttributes.length ; i += 1) {
                            var attribute = existingAttributes[i];
                            if (attribute.name !== 'type' && attribute.name !== 'id') {
                                node.setAttribute(attribute.name, attribute.value);
                            }
                        }
                    }
                    document.head.appendChild(node);
                    var htmlInlineScriptTemplate = new assetGraph.HtmlInlineScriptTemplate({
                        to: relationToInline.to,
                        node: node
                    });
                    htmlAsset.addRelation(htmlInlineScriptTemplate);
                    htmlInlineScriptTemplate.inline();
                    // These are attached separately
                    assetGraph.findRelations({from: htmlInlineScriptTemplate.to, type: 'HtmlInlineScriptTemplate'}).forEach(function (htmlInlineScriptTemplate) {
                        htmlInlineScriptTemplate.detach();
                    });
                    if (id) {
                        alreadyInlinedById[id] = true;
                    }
                }
            });
        });
        Object.keys(relationsToDetachById).forEach(function (relationId) {
            relationsToDetachById[relationId].detach();
        });

        // Template assets that had more than one incoming relation to begin with will
        // be cloned in the .inline() call above. Remove the template assets that have
        // become orphans:
        Object.keys(potentiallyOrphanedAssetsById).forEach(function (assetId) {
            var asset = potentiallyOrphanedAssetsById[assetId];
            if (assetGraph.findRelations({to: asset}).length === 0) {
                assetGraph.removeAsset(asset);
            }
        });
    };
};
