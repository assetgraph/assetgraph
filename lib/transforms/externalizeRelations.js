module.exports = queryObj => {
  return function externalizeRelations(assetGraph) {
    for (const relation of assetGraph.findRelations(queryObj)) {
      if (relation.to.isInline && relation.to.isExternalizable) {
        relation.to.externalize();
      }
    }
  };
};
