var relations = require('../relations');

module.exports = function (queryObj) {
    return function flattenStaticIncludes(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (initialAsset) {
            var seenAssets = {}; // Only add one <link rel='stylesheet'> / <script> per asset.
            assetGraph.findRelations({from: initialAsset, type: 'HtmlScript'}).forEach(function (htmlScriptRelation) {
                var htmlStyleInsertionPoint,
                    existingHtmlStyleRelations = assetGraph.findRelations({type: 'HtmlStyle', from: initialAsset}, true); // includeUnpopulated
                if (existingHtmlStyleRelations.length > 0) {
                    htmlStyleInsertionPoint = existingHtmlStyleRelations[existingHtmlStyleRelations.length - 1];
                }

                (function traversePostorder(asset) {
                    if (!seenAssets[asset.id]) {
                        assetGraph.findRelations({from: asset, type: ['JavaScriptOneInclude', 'JavaScriptExtJsRequire']}).forEach(function (relation) {
                            if (!(relation.to.id in seenAssets)) {
                                traversePostorder(relation.to);
                                seenAssets[relation.to.id] = true;
                                if (relation.to.type === 'Css') {
                                    var htmlStyle = new relations.HtmlStyle({from: initialAsset, to: relation.to});
                                    if (htmlStyleInsertionPoint) {
                                        assetGraph.attachAndAddRelation(htmlStyle, 'after', htmlStyleInsertionPoint);
                                    } else {
                                        assetGraph.attachAndAddRelation(htmlStyle, 'first');
                                    }
                                    htmlStyleInsertionPoint = htmlStyle;
                                } else if (relation.to.type === 'JavaScript') {
                                    assetGraph.attachAndAddRelation(new relations.HtmlScript({from: initialAsset, to: relation.to}), 'before', htmlScriptRelation);
                                } else if (relation.to.type !== 'I18n') {
                                    // Don't do anything for relations to I18n assets.
                                    throw new Error("transforms.flattenStaticIncludes assertion error: Relation to " + relation.to.type + " not supported");
                                }
                            }
                            if (asset === htmlScriptRelation.to && relation.type === 'JavaScriptOneInclude') {
                                relation.from.detachRelation(relation);
                            }
                            assetGraph.removeRelation(relation);
                        });
                    }
                }(htmlScriptRelation.to));
            });
        });
    };
};
