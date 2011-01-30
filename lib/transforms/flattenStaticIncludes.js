var step = require('step'),
    relations = require('../relations');

function flattenStaticIncludesForAsset(assetGraph, asset, cb) {
    var seenAssets = {};
    assetGraph.findRelations('from', asset).forEach(function (htmlScriptRelation) { // FIXME
        var htmlStyleInsertionPoint;
        assetGraph.lookupSubgraph(htmlScriptRelation.to, function (relation) {
            return relation.type === 'JavaScriptStaticInclude';
        }).relations.forEach(function (relation) {
            if (relation.from.type === 'CSS') { // FIXME: Narrow down the subgraph instead
                return;
            }
            if (!(relation.to.id in seenAssets)) {
                seenAssets[relation.to.id] = true;
                if (relation.to.type === 'CSS') {
                    var htmlStyle = new relations.HTMLStyle({from: asset, to: relation.to});
                    if (htmlStyleInsertionPoint) {
                        assetGraph.attachAndAddRelation(htmlStyle, 'after', htmlStyleInsertionPoint);
                    } else {
                        assetGraph.attachAndAddRelation(htmlStyle, 'first');
                    }
                    htmlStyleInsertionPoint = htmlStyle;
                } else {
                    assetGraph.attachAndAddRelation(new relations.HTMLScript({from: asset, to: relation.to}), 'before', htmlScriptRelation);
                }
            }
            assetGraph.detachAndRemoveRelation(relation);
            htmlScriptRelation.to.isDirty = true;
        });
    });
    process.nextTick(cb);
};

exports.flattenStaticIncludes = function () {
    return function flattenStaticIncludes(assetGraph, cb) {
        step(
            function () {
                assetGraph.findAssets('isInitial', true).forEach(function (initialAsset) {
                    flattenStaticIncludesForAsset(assetGraph, initialAsset, this.parallel());
                }, this);
            },
            function () {
                process.nextTick(function () {
                    cb(null, assetGraph);
                });
            }
        );
    };
};
