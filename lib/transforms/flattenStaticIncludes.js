var relations = require('../relations');

module.exports = function (queryObj) {
    return function flattenStaticIncludes(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (initialAsset) {
            var seenAssets = {}; // Only add one <link rel='stylesheet'> / <script> per asset.
            assetGraph.findRelations({from: initialAsset, type: 'HTMLScript'}).forEach(function (htmlScriptRelation) {
                var htmlStyleInsertionPoint,
                    existingHTMLStyleRelations = assetGraph.findRelations({type: 'HTMLStyle', from: initialAsset});
                if (existingHTMLStyleRelations.length > 0) {
                    htmlStyleInsertionPoint = existingHTMLStyleRelations[existingHTMLStyleRelations.length - 1];
                }

                (function traversePostorder(asset) {
                    if (!seenAssets[asset.id]) {
                        assetGraph.findRelations({from: asset, type: 'JavaScriptStaticInclude'}).forEach(function (relation) {
                            if (!(relation.to.id in seenAssets)) {
                                traversePostorder(relation.to);
                                seenAssets[relation.to.id] = true;
                                if (relation.to.type === 'CSS') {
                                    var htmlStyle = new relations.HTMLStyle({from: initialAsset, to: relation.to});
                                    if (htmlStyleInsertionPoint) {
                                        assetGraph.attachAndAddRelation(htmlStyle, 'after', htmlStyleInsertionPoint);
                                    } else {
                                        assetGraph.attachAndAddRelation(htmlStyle, 'first');
                                    }
                                    htmlStyleInsertionPoint = htmlStyle;
                                } else if (relation.to.type === 'JavaScript') {
                                    assetGraph.attachAndAddRelation(new relations.HTMLScript({from: initialAsset, to: relation.to}), 'before', htmlScriptRelation);
                                }
                                // Don't do anything for relations to I18N assets.
                            }
                            if (asset === htmlScriptRelation.to) {
                                assetGraph.detachAndRemoveRelation(relation);
                            } else {
                                assetGraph.removeRelation(relation);
                            }
                        });
                    }
                }(htmlScriptRelation.to));
            });
        });
    };
};
