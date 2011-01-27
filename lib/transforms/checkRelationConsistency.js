exports.checkRelationConsistency = function () {
    return function checkRelationConsistency(siteGraph, cb) {
        var numErrors = 0;
        siteGraph.relations.forEach(function (relation) {
            if (siteGraph.assets.indexOf(relation.from) === -1) {
                console.log("checkRelationConsistency fail, source asset for " + relation + " not found");
                numErrors += 1;
            }
            if (siteGraph.assets.indexOf(relation.to) === -1) {
                console.log("checkRelationConsistency fail, asset pointed to by " + relation + " not in graph");
                numErrors += 1;
            }
        });
        process.nextTick(function () {
            cb(numErrors === 0 ? null : new Error("SiteGraph is inconsistent"));
        });
    };
};
