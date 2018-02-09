module.exports = queryObj => {
  return function applySourceMaps(assetGraph) {
    for (const asset of assetGraph.findAssets(
      queryObj || { type: { $in: ['JavaScript', 'Css'] } }
    )) {
      const sourceMappingUrl = assetGraph.findRelations({
        from: asset,
        type: /SourceMappingUrl$/,
        to: { type: 'SourceMap', isLoaded: true }
      })[0];
      if (sourceMappingUrl) {
        if (asset.parseTree) {
          // Absolutify urls in sources array before applying:
          const shallowCopy = Object.assign({}, sourceMappingUrl.to.parseTree);
          if (Array.isArray(shallowCopy.sources)) {
            const nonInlineAncestorUrl =
              sourceMappingUrl.to.nonInlineAncestor.url;
            shallowCopy.sources = shallowCopy.sources.map(sourceUrl =>
              assetGraph.resolveUrl(nonInlineAncestorUrl, sourceUrl)
            );
          }
          asset.sourceMap = shallowCopy;
        }
      }
    }
  };
};
