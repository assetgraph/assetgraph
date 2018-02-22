module.exports = queryObj => {
  return function inlineRelations(assetGraph) {
    for (const relation of assetGraph.findRelations(queryObj)) {
      relation.inline();
    }
  };
};
