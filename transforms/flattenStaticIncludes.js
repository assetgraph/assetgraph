var step = require('step'),
    relations = require('../relations');

function flattenStaticIncludesForAsset(siteGraph, asset, cb) {
    var seenAssets = {};
    siteGraph.findRelations('from', asset).forEach(function (htmlScriptRelation) { // FIXME
        var htmlStyleInsertionPoint;
        siteGraph.lookupSubgraph(htmlScriptRelation.to, function (relation) {
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
                        siteGraph.attachAndRegisterRelation(htmlStyle, 'after', htmlStyleInsertionPoint);
                    } else {
                        siteGraph.attachAndRegisterRelation(htmlStyle, 'first');
                    }
                    htmlStyleInsertionPoint = htmlStyle;
                } else {
                    siteGraph.attachAndRegisterRelation(new relations.HTMLScript({from: asset, to: relation.to}), 'before', htmlScriptRelation);
                }
            }
            siteGraph.detachAndUnregisterRelation(relation);
            htmlScriptRelation.to.isDirty = true;
        });
    });
    process.nextTick(function () {
        cb(null, siteGraph);
    });
};

exports.flattenStaticIncludes = function flattenStaticIncludes() {
    return function (siteGraph, cb) {
        step(
            function () {
                siteGraph.findAssets('isInitial', true).forEach(function (initialAsset) {
                    flattenStaticIncludesForAsset(siteGraph, initialAsset, this.parallel());
                }, this);
            },
            function () {
                process.nextTick(function () {
                    cb(null, siteGraph);
                });
            }
        );
    };
};
