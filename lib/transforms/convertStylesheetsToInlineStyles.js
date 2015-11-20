var _ = require('lodash'),
    AssetGraph = require('../');

module.exports = function (queryObj, media) {
    var includeByMedium = {};
    if (!media) {
        includeByMedium.all = true;
    } else {
        media.split(',').forEach(function (medium) {
            includeByMedium[medium.replace(/^\s+|\s+$/g, '')] = true;
        });
    }
    function includeMedia(media) {
        return includeByMedium.all || media.some(function (medium) {
            medium = medium.replace(/^\s+|\s+$/g, '');
            return medium === 'all' || includeByMedium[medium];
        });
    }

    return function convertStylesheetsToInlineStyles(assetGraph) {
        assetGraph.findAssets(_.extend({isHtml: true}, queryObj)).forEach(function (htmlAsset) {
            var document = htmlAsset.parseTree;
            assetGraph.eachAssetPostOrder(htmlAsset, function (relation) {
                if (relation.type === 'HtmlStyle' || relation.type === 'CssImport') {
                    var relationMedia = ['all'];
                    if (relation.type === 'HtmlStyle') {
                        relationMedia = (relation.node.getAttribute('media') || 'all').split(',');
                    } else if (relation.type === 'CssImport') {
                        var mediaStr = relation.media;
                        if (mediaStr) {
                            relationMedia = mediaStr.split(' ');
                        }
                    }
                    if (includeMedia(relationMedia)) {
                        return true;
                    } else {
                        if (assetGraph.findRelations({to: relation.to}).length === 1) {
                            assetGraph.removeAsset(relation.to, true);
                        }
                    }
                }
                return false;
            }, function (cssAsset, incomingRelation) {
                if (cssAsset.type === 'Css') {
                    cssAsset.eachRuleInParseTree(function (cssRule) {
                        if (cssRule.type === 'rule') {
                            _.toArray(document.querySelectorAll(cssRule.selector)).forEach(function (node) {
                                if (node.nodeName === 'style' || node === document.head || node.parentNode === document.head) {
                                    return;
                                }
                                var inlineCssAsset,
                                    htmlStyleAttributeRelation = assetGraph.findRelations({
                                        from: htmlAsset,
                                        type: 'HtmlStyleAttribute',
                                        node: function (_node) {
                                            return _node === node;
                                        }
                                    })[0];
                                if (htmlStyleAttributeRelation) {
                                    inlineCssAsset = htmlStyleAttributeRelation.to;
                                } else {
                                    inlineCssAsset = new assetGraph.Css({text: 'bogusselector {}'});
                                    htmlStyleAttributeRelation = new AssetGraph.HtmlStyleAttribute({
                                        node: node,
                                        from: htmlAsset,
                                        to: inlineCssAsset
                                    });
                                    assetGraph.addAsset(inlineCssAsset);
                                    assetGraph.addRelation(htmlStyleAttributeRelation);
                                }
                                var styleRuleIndex = inlineCssAsset.parseTree.nodes.length;

                                inlineCssAsset.parseTree.nodes[0].append(cssRule.nodes.map(function (node) {
                                    return node.clone({ raws: { before: ' ', between: (node.raws && node.raws.between) || ': ' } });
                                }));
                                assetGraph.findRelations({
                                    from: cssAsset,
                                    node: function (_node) {
                                        return _node === node;
                                    }
                                }).forEach(function (cssRelation) {
                                    assetGraph.addRelation(new cssRelation.constructor({
                                        parentNode: inlineCssAsset.parseTree,
                                        node: inlineCssAsset.parseTree.nodes[0],
                                        propertyNode: inlineCssAsset.parseTree.nodes[styleRuleIndex],
                                        from: inlineCssAsset,
                                        to: cssRelation.to
                                    }));
                                });
                                inlineCssAsset.markDirty();
                            });
                        } else if (cssRule.type === 'atrule' && cssRule.name === 'media') {
                            if (!includeMedia(cssRule.params.split(' '))) {
                                return false;
                            }
                        }
                    });
                    if (assetGraph.findRelations({to: cssAsset}).length === 1) {
                        assetGraph.removeAsset(cssAsset, true);
                    } else {
                        incomingRelation.detach();
                    }
                }
            });
        });
    };
};
