module.exports = ({ detach = false, removeOrphan = false } = {}) => {
  return function removeRelations(assetGraph) {
    for (const relation of assetGraph.findRelations()) {
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
