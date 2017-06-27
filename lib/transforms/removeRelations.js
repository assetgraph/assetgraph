module.exports = (queryObj, options) => {
    options = options || {};
    return function removeRelations(assetGraph) {
        for (const relation of assetGraph.findRelations(queryObj, options.unresolved)) {
            if (options.detach) {
                relation.detach();
            } else {
                relation.remove();
            }
            if (options.removeOrphan && relation.to.isAsset && relation.to.incomingRelations.length === 0) {
                assetGraph.removeAsset(relation.to);
            }
        }
    };
};
