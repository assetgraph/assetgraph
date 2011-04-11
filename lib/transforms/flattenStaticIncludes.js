var relations = require('../relations'),
    traversal = require('../traversal');

module.exports = function (queryObj) {
    return function flattenStaticIncludes(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        assetGraph.findAssets(queryObj).forEach(function (initialAsset) {
            var seenAssets = {}; // Only add one <link rel='stylesheet'> / <script> per asset.
            assetGraph.findRelations({from: initialAsset, type: 'HTMLScript'}).forEach(function (htmlScriptRelation) {
                var htmlStyleInsertionPoint;
                traversal.eachAssetPostOrder(assetGraph, htmlScriptRelation, {type: 'JavaScriptStaticInclude'}, function (asset, incomingRelation) {
                    if (asset.type === 'CSS') {
                        var htmlStyle = new relations.HTMLStyle({from: initialAsset, to: asset});
                        if (htmlStyleInsertionPoint) {
                            assetGraph.attachAndAddRelation(htmlStyle, 'after', htmlStyleInsertionPoint);
                        } else {
                            assetGraph.attachAndAddRelation(htmlStyle, 'first');
                        }
                        htmlStyleInsertionPoint = htmlStyle;
                    } else {
                        assetGraph.attachAndAddRelation(new relations.HTMLScript({from: initialAsset, to: asset}), 'before', htmlScriptRelation);
                    }
                    if (asset === htmlScriptRelation.to) {
                        assetGraph.detachAndRemoveRelation(incomingRelation);
                    } else {
                        assetGraph.removeRelation(incomingRelation);
                    }
                });
                // Don't leave an empty script (it might be empty after those relations were detached):
                if (htmlScriptRelation.to.parseTree[1].length === 0) { // ['toplevel', []]
                    assetGraph.findRelations({to: htmlScriptRelation.to}).forEach(function (incomingRelation) {
                        assetGraph.detachAndRemoveRelation(incomingRelation);
                    });
                    assetGraph.removeAsset(htmlScriptRelation.to);
                }
            });
        });
        process.nextTick(cb);
    };
};
