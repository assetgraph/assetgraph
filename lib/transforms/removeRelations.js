module.exports = function (queryObj, options) {
    options = options || {};
    return function removeRelations(assetGraph) {
        assetGraph.findRelations(queryObj, options.unresolved).forEach(function (relation) {
            if (options.detach) {
                relation.detach();
            } else {
                relation.remove();
            }
            if (options.removeOrphan && relation.to.isAsset && relation.to.incomingRelations.length === 0) {
                assetGraph.removeAsset(relation.to);
            }
        });
    };
};
