const _ = require('lodash');
const AssetGraph = require('../AssetGraph');

module.exports = (queryObj, media) => {
    const includeByMedium = {};
    if (!media) {
        includeByMedium.all = true;
    } else {
        for (const medium of media.split(',')) {
            includeByMedium[medium.replace(/^\s+|\s+$/g, '')] = true;
        }
    }
    function includeMedia(media) {
        return includeByMedium.all || media.some(medium => {
            medium = medium.replace(/^\s+|\s+$/g, '');
            return medium === 'all' || includeByMedium[medium];
        });
    }

    return function convertStylesheetsToInlineStyles(assetGraph) {
        for (const htmlAsset of assetGraph.findAssets(_.extend({isHtml: true}, queryObj))) {
            const document = htmlAsset.parseTree;
            assetGraph.eachAssetPostOrder(htmlAsset, relation => {
                if (relation.type === 'HtmlStyle' || relation.type === 'CssImport') {
                    let relationMedia = [ 'all' ];
                    if (relation.type === 'HtmlStyle') {
                        relationMedia = (relation.node.getAttribute('media') || 'all').split(',');
                    } else if (relation.type === 'CssImport') {
                        const mediaStr = relation.media;
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
            }, (cssAsset, incomingRelation) => {
                if (cssAsset.type === 'Css') {
                    cssAsset.eachRuleInParseTree(cssRule => {
                        if (cssRule.type === 'rule') {
                            for (const node of _.toArray(document.querySelectorAll(cssRule.selector))) {
                                if (node.nodeName.toLowerCase() === 'style' || node === document.head || node.parentNode === document.head) {
                                    continue;
                                }
                                let inlineCssAsset;
                                let htmlStyleAttributeRelation = assetGraph.findRelations({
                                    from: htmlAsset,
                                    type: 'HtmlStyleAttribute',
                                    node: _node => _node === node
                                })[0];
                                if (htmlStyleAttributeRelation) {
                                    inlineCssAsset = htmlStyleAttributeRelation.to;
                                } else {
                                    inlineCssAsset = new assetGraph.Css({text: 'bogusselector {}'});
                                    htmlStyleAttributeRelation = new AssetGraph.HtmlStyleAttribute({
                                        node,
                                        to: inlineCssAsset
                                    });
                                    assetGraph.addAsset(inlineCssAsset);
                                    htmlAsset.addRelation(htmlStyleAttributeRelation);
                                }
                                const styleRuleIndex = inlineCssAsset.parseTree.nodes.length;

                                inlineCssAsset.parseTree.nodes[0].append(cssRule.nodes.map(node => {
                                    return node.clone({ raws: { before: ' ', between: (node.raws && node.raws.between) || ': ' } });
                                }));
                                for (const cssRelation of assetGraph.findRelations({
                                    from: cssAsset,
                                    node: _node => _node === node
                                })) {
                                    inlineCssAsset.addRelation(new cssRelation.constructor({
                                        parentNode: inlineCssAsset.parseTree,
                                        node: inlineCssAsset.parseTree.nodes[0],
                                        propertyNode: inlineCssAsset.parseTree.nodes[styleRuleIndex],
                                        to: cssRelation.to
                                    }));
                                }
                                inlineCssAsset.markDirty();
                            }
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
        }
    };
};
