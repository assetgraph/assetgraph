var relations = require('../relations');

exports.flattenStaticIncludes = function flattenStaticIncludes(siteGraph, template, cb) {
    var seenAssets = {};
    siteGraph.findRelations('from', template).forEach(function (htmlScriptRelation) {
        var htmlStyleInsertionPoint;
        siteGraph.lookupSubgraph(htmlScriptRelation.to, function (relation) {
            return relation.type === 'JavaScriptStaticInclude';
        }).relations.forEach(function (relation) {
            if (!(relation.to.id in seenAssets)) {
                seenAssets[relation.to.id] = true;
                if (relation.to.type === 'CSS') {
                    var htmlStyle = new relations.HTMLStyle({from: template, to: relation.to});
                    if (htmlStyleInsertionPoint) {
                        siteGraph.registerRelation(htmlStyle, 'after', htmlStyleInsertionPoint);
                    } else {
                        siteGraph.registerRelation(htmlStyle, 'first');
                    }
                    htmlStyleInsertionPoint = htmlStyle;
                } else {
                    siteGraph.registerRelation(new relations.HTMLScript({from: template, to: relation.to}), 'before', htmlScriptRelation);
                }
            }
            siteGraph.unregisterRelation(relation);
            htmlScriptRelation.to.dirty = true;
        });
    });
    cb();
};
