var _ = require('underscore'),
    cssom = require('cssom-papandreou'),
    AssetGraph = require('../');

module.exports = function (queryObj, media) {
    var includeByMedium = {};
    if (!media) {
        includeByMedium.all = true;
    } else {
        media.split(",").forEach(function (medium) {
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
                    } else if (relation.type === 'CssImport' && relation.cssRule.media.length > 0) {
                        relationMedia = _.toArray(relation.cssRule.media);
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
                        if (cssRule.type === cssom.CSSRule.STYLE_RULE) {
                            _.toArray(document.querySelectorAll(cssRule.selectorText)).forEach(function (node) {
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
                                    inlineCssAsset = new assetGraph.Css({text: ""});
                                    htmlStyleAttributeRelation = new AssetGraph.HtmlStyleAttribute({
                                        node: node,
                                        from: htmlAsset,
                                        to: inlineCssAsset
                                    });
                                    assetGraph.addAsset(inlineCssAsset);
                                    assetGraph.addRelation(htmlStyleAttributeRelation);
                                }
                                var styleRuleIndex = inlineCssAsset.parseTree.cssRules.length;
                                inlineCssAsset.parseTree.insertRule('bogusselector {' + cssRule.style.cssText + '}', styleRuleIndex);
                                var styleRule = inlineCssAsset.parseTree.cssRules[styleRuleIndex];
                                assetGraph.findRelations({
                                    from: cssAsset,
                                    cssRule: function (_cssRule) {
                                        return _cssRule === cssRule;
                                    }
                                }).forEach(function (cssRelation) {
                                    assetGraph.addRelation(new cssRelation.constructor({
                                        cssRule: styleRule,
                                        from: inlineCssAsset,
                                        to: cssRelation.to
                                    }));
                                });
                                inlineCssAsset.markDirty();
                            });
                        } else if (cssRule.type === cssom.CSSRule.MEDIA_RULE) {
                            if (!includeMedia(_.toArray(cssRule.media))) {
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
