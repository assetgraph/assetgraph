module.exports = function (queryObj, options) {
    options = options || {};
    return function removeRelations(assetGraph) {
        assetGraph.findRelations(queryObj, options.unresolved).forEach(function (relation) {
            if (options.detach) {
                assetGraph.detachAndRemoveRelation(relation);
            } else {
                assetGraph.removeRelation(relation);
            }
            if (options.removeOrphan && relation.to.incomingRelations.length === 0) {
                assetGraph.removeAsset(relation.to);
            }
        });
    };
};
