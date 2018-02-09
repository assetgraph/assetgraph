module.exports = queryObj => {
  return function removeEmptyStylesheets(assetGraph) {
    for (const asset of assetGraph.findAssets(
      Object.assign({ type: 'Css', isLoaded: true, isEmpty: true }, queryObj)
    )) {
      let everyIncomingRelationRemoved = true;
      for (const incomingRelation of asset.incomingRelations) {
        let safeToRemove = true;
        if (incomingRelation.type === 'HtmlStyle') {
          for (const attribute of Array.from(
            incomingRelation.node.attributes
          )) {
            if (
              attribute.name !== 'media' &&
              (attribute.name !== 'rel' || attribute.value !== 'stylesheet') &&
              (attribute.name !== 'href' ||
                incomingRelation.node.nodeName.toLowerCase() !== 'link') &&
              (attribute.name !== 'type' || attribute.value !== 'text/css')
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
