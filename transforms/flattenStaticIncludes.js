var relations = require('../relations');

exports.flattenStaticIncludes = function flattenStaticIncludes(siteGraph, template, cb) {
    var seenAssets = {};
    siteGraph.findRelations('from', template).forEach(function (htmlScriptRelation) {
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
                    var htmlStyle = new relations.HTMLStyle({from: template, to: relation.to});
                    if (htmlStyleInsertionPoint) {
                        siteGraph.attachAndRegisterRelation(htmlStyle, 'after', htmlStyleInsertionPoint);
                    } else {
                        siteGraph.attachAndRegisterRelation(htmlStyle, 'first');
                    }
                    htmlStyleInsertionPoint = htmlStyle;
                } else {
                    siteGraph.attachAndRegisterRelation(new relations.HTMLScript({from: template, to: relation.to}), 'before', htmlScriptRelation);
                }
            }
            siteGraph.detachAndUnregisterRelation(relation);
            htmlScriptRelation.to.dirty = true;
        });
    });
    cb(null, siteGraph);
};
