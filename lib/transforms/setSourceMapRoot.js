let defaultQuery = { type: 'SourceMap' };

module.exports = (queryObj, root) => {
  if (queryObj) {
    queryObj = { $and: [queryObj, defaultQuery] };
  } else {
    queryObj = defaultQuery;
  }

  return function setSourceMapRoot(assetGraph) {
    for (const sourceMap of assetGraph.findAssets(queryObj)) {
      delete sourceMap.parseTree.sourceRoot;
      const newTargetUrlByAssetId = {};
      for (const sourceMapSource of assetGraph.findRelations({
        from: sourceMap,
        type: 'SourceMapSource'
      })) {
        if (!sourceMapSource.to.isLoaded) {
          newTargetUrlByAssetId[sourceMapSource.to.id] = assetGraph.resolveUrl(
            root
              ? assetGraph.resolveUrl(
                  sourceMapSource.baseUrl,
                  root.replace(/\/?$/, '/')
                )
              : sourceMapSource.baseUrl,
            sourceMapSource.href
          );
        }
      }
      for (const sourceMapSource of assetGraph.findRelations({
        from: sourceMap,
        type: 'SourceMapSource'
      })) {
        // Patch up target url of unpopulated relation
        const newTargetUrl = newTargetUrlByAssetId[sourceMapSource.to.id];
        if (newTargetUrl) {
          sourceMapSource.to.url = newTargetUrl;
        }
      }
      if (root) {
        sourceMap.parseTree.sourceRoot = root;
        for (const sourceMapSource of assetGraph.findRelations({
          from: sourceMap,
          type: 'SourceMapSource'
        })) {
          sourceMapSource.refreshHref();
        }
      }
    }
  };
};
