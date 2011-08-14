var relations = require('../relations');

module.exports = function (queryObj) {
    return function flattenStaticIncludes(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (initialAsset) {
            var addedAssetsById = {}; // Only add one <link rel='stylesheet'> / <script> per asset.
            assetGraph.findRelations({from: initialAsset, type: 'HtmlScript'}).forEach(function (htmlScriptRelation) {
                var htmlStyleInsertionPoint,
                    existingHtmlStyleRelations = assetGraph.findRelations({type: 'HtmlStyle', from: initialAsset}, true); // includeUnpopulated
                if (existingHtmlStyleRelations.length > 0) {
                    htmlStyleInsertionPoint = existingHtmlStyleRelations[existingHtmlStyleRelations.length - 1];
                }
                var pathByAssetId = {};
                (function traversePostorder(asset) {
                    pathByAssetId[asset.id] = true;
                    assetGraph.findRelations({from: asset, type: ['JavaScriptOneInclude', 'JavaScriptExtJsRequire']}).forEach(function (relation) {
                        if (relation.to.id in pathByAssetId) {
                            console.warn("transforms.flattenStaticIncludes: Cycle detected: " + relation);
                        } else {
                            traversePostorder(relation.to);
                            if (!(relation.to.id in addedAssetsById)) {
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
                                addedAssetsById[relation.to.id] = true;
                            }
                            if (asset === htmlScriptRelation.to && relation.type === 'JavaScriptOneInclude') {
                                relation.from.detachRelation(relation);
                            }
                            assetGraph.removeRelation(relation);
                        }
                    });
                    delete pathByAssetId[asset.id];
                }(htmlScriptRelation.to));
            });
        });
    };
};
