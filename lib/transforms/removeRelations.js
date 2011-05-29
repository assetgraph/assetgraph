module.exports = function (queryObj, options) {
    options = options || {};
    return function removeRelations(assetGraph) {
        assetGraph.findRelations(queryObj, options.unresolved).forEach(function (relation) {
            if (options.detach) {
                assetGraph.detachAndRemoveRelation(relation);
            } else {
                assetGraph.removeRelation(relation);
            }
        });
    };
};
