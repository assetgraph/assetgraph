var relations = require('../relations');

exports.flattenStaticIncludes = function (queryObj) {
    return function flattenStaticIncludes(err, assetGraph, cb) {
        assetGraph.findAssets(queryObj).forEach(function (initialAsset) {
            var seenAssets = {}; // Only add one <link rel='stylesheet'> / <script> per asset.
            assetGraph.findRelations({from: initialAsset, type: 'HTMLScript'}).forEach(function (htmlScriptRelation) {
                var htmlStyleInsertionPoint;
                (function traversePostorder(asset) {
                    if (!seenAssets[asset.id]) {
                        assetGraph.findRelations({from: asset, type: 'JavaScriptStaticInclude'}).forEach(function (relation) {
                            traversePostorder(relation.to);
                            if (!(relation.to.id in seenAssets)) {
                                seenAssets[relation.to.id] = true;
                                if (relation.to.type === 'CSS') {
                                    var htmlStyle = new relations.HTMLStyle({from: initialAsset, to: relation.to});
                                    if (htmlStyleInsertionPoint) {
                                        assetGraph.attachAndAddRelation(htmlStyle, 'after', htmlStyleInsertionPoint);
                                    } else {
                                        assetGraph.attachAndAddRelation(htmlStyle, 'first');
                                    }
                                    htmlStyleInsertionPoint = htmlStyle;
                                } else {
                                    assetGraph.attachAndAddRelation(new relations.HTMLScript({from: initialAsset, to: relation.to}), 'before', htmlScriptRelation);
                                }
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
        process.nextTick(cb);
    };
};
