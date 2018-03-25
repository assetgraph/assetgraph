module.exports = (queryObj, { detach = false, removeOrphan = false } = {}) => {
  return function removeRelations(assetGraph) {
    for (const relation of assetGraph.findRelations(queryObj)) {
      if (detach) {
        relation.detach();
      } else {
        relation.remove();
      }
      if (
        removeOrphan &&
        relation.to.isAsset &&
        relation.to.incomingRelations.length === 0
      ) {
        assetGraph.removeAsset(relation.to);
      }
    }
  };
};
