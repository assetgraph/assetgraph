module.exports = function () {
    return function checkRelationConsistency(assetGraph, cb) {
        var numErrors = 0;
        assetGraph.relations.forEach(function (relation) {
            if (assetGraph.assets.indexOf(relation.from) === -1) {
                console.log("checkRelationConsistency fail, source asset for " + relation + " not found");
                numErrors += 1;
            }
            if (assetGraph.assets.indexOf(relation.to) === -1) {
                console.log("checkRelationConsistency fail, asset pointed to by " + relation + " not in graph");
                numErrors += 1;
            }
        });
        process.nextTick(function () {
            cb(numErrors === 0 ? null : new Error("AssetGraph is inconsistent"));
        });
    };
};
