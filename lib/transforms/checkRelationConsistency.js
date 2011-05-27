module.exports = function () {
    return function checkRelationConsistency(assetGraph) {
        var numErrors = 0;
        assetGraph.findRelations().forEach(function (relation) {
            if (assetGraph.findAssets().indexOf(relation.from) === -1) {
                console.log("checkRelationConsistency fail, source asset for " + relation + " not found");
                numErrors += 1;
            }
            if (assetGraph.findAssets().indexOf(relation.to) === -1) {
                console.log("checkRelationConsistency fail, asset pointed to by " + relation + " not in graph");
                numErrors += 1;
            }
        });
        if (numErrors > 0) {
            throw new Error("transforms.checkRelationConsistency: AssetGraph is inconsistent");
        }
    };
};
