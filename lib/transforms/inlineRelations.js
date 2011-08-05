module.exports = function (queryObj) {
    return function inlineRelations(assetGraph) {
        assetGraph.findRelations(queryObj).forEach(function (relation) {
            assetGraph.inlineRelation(relation);
        });
    };
};
