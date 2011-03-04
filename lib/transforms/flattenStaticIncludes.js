var relations = require('../relations');

exports.flattenStaticIncludes = function () {
    return function flattenStaticIncludes(err, assetGraph, cb) {
        assetGraph.findAssets({isInitial: true}).forEach(function (initialAsset) {
            var seenAssets = {}; // Only add one <link rel='stylesheet'> / <script> per asset.
            assetGraph.findRelations({from: initialAsset, type: 'HTMLScript'}).forEach(function (htmlScriptRelation) {
                var htmlStyleInsertionPoint;
                assetGraph.createSubgraph(htmlScriptRelation.to, {
                    type: 'JavaScriptStaticInclude'
                }).relations.forEach(function (relation) {
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
                    assetGraph.detachAndRemoveRelation(relation);
                });
            });
        });
        process.nextTick(cb);
    };
};
