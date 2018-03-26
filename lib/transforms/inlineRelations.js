module.exports = () => {
  return function inlineRelations(assetGraph) {
    // FIXME: Was assetGraph.findRelations(queryObj)
    for (const relation of assetGraph.findRelations()) {
      relation.inline();
    }
  };
};
