module.exports = function (queryObj, doDetach) {
    return function removeRelations(assetGraph) {
        assetGraph.findRelations(queryObj).forEach(function (relation) {
            if (doDetach) {
                assetGraph.detachAndRemoveRelation(relation);
            } else {
                assetGraph.removeRelation(relation);
            }
        });
    };
};
