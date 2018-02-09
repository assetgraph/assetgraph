module.exports = queryObj => {
  return function convertCssImportsToHtmlStyles(assetGraph) {
    for (const htmlAsset of assetGraph.findAssets(
      Object.assign({ type: 'Html' }, queryObj)
    )) {
      for (const htmlStyle of assetGraph.findRelations({
        type: 'HtmlStyle',
        from: htmlAsset
      })) {
        assetGraph.eachAssetPostOrder(
          htmlStyle,
          { type: 'CssImport' },
          (cssAsset, incomingRelation) => {
            if (incomingRelation.type === 'CssImport') {
              htmlAsset.addRelation(
                {
                  type: 'HtmlStyle',
                  hrefType: incomingRelation.hrefType,
                  media: incomingRelation.media,
                  to: cssAsset
                },
                'before',
                htmlStyle
              );
              incomingRelation.detach();
            }
          }
        );
      }
    }
  };
};
