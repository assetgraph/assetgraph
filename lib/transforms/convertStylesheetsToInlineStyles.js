var _ = require('underscore'),
    cssom = require('cssom-papandreou');

module.exports = function (queryObj, media) {
    var includeByMedium = {};
    if (!media) {
        includeByMedium.all = true;
    } else {
        media.split(",").forEach(function (medium) {
            includeByMedium[medium.replace(/^\s+|\s+$/g, '')] = true;
        });
    }
    return function convertStylesheetsToInlineStyles(assetGraph) {
        assetGraph.findAssets(_.extend({isHtml: true}, queryObj)).forEach(function (htmlAsset) {
            var document = htmlAsset.parseTree;
            assetGraph.eachAssetPostOrder(htmlAsset, {type: ['HtmlStyle', 'CssImport']}, function (cssAsset, incomingRelation) {
                if (cssAsset.type === 'Css') {
                    cssAsset.constructor.eachRuleInParseTree(cssAsset.parseTree, function (cssRule) {
                        if (cssRule.type === cssom.CSSRule.STYLE_RULE) {
                            document.querySelectorAll(cssRule.selectorText).forEach(function (node) {
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
                                    inlineCssAsset = new assetGraph.constructor.assets.Css({text: ""});
                                    htmlStyleAttributeRelation = new assetGraph.constructor.relations.HtmlStyleAttribute({
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
                            if (!includeByMedium.all && !_.toArray(cssRule.media).some(function (medium) {return includeByMedium[medium];})) {
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
