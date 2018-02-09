module.exports = queryObj => {
  return function removeEmptyJavaScripts(assetGraph) {
    for (const asset of assetGraph.findAssets(
      Object.assign(
        { type: 'JavaScript', isLoaded: true, isEmpty: true },
        queryObj
      )
    )) {
      let everyIncomingRelationRemoved = true;
      for (const incomingRelation of asset.incomingRelations) {
        let safeToRemove = true;
        if (incomingRelation.type === 'HtmlScript') {
          for (const attribute of Array.from(
            incomingRelation.node.attributes
          )) {
            if (
              attribute.name !== 'src' &&
              (attribute.name !== 'defer' || attribute.value !== 'defer') &&
              (attribute.name !== 'async' || attribute.value !== 'async') &&
              (attribute.name !== 'type' ||
                attribute.value !== 'text/javascript')
            ) {
              safeToRemove = false;
              break; // Don't bother checking the remaining attributes
            }
          }
        }
        if (safeToRemove) {
          incomingRelation.detach();
        } else {
          everyIncomingRelationRemoved = false;
        }
      }
      if (everyIncomingRelationRemoved) {
        assetGraph.removeAsset(asset);
      }
    }
  };
};
