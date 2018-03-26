module.exports = () => {
  return function externalizeRelations(assetGraph) {
    // FIXME: Was assetGraph.findRelations(queryObj)
    for (const relation of assetGraph.findRelations()) {
      if (relation.to.isInline && relation.to.isExternalizable) {
        relation.to.externalize();
      }
    }
  };
};
