// https://github.com/One-com/assetgraph/issues/82

module.exports = () => {
  return function removeDuplicateHtmlStyles(assetGraph) {
    for (const htmlAsset of assetGraph.findAssets({ type: 'Html' })) {
      const seenCssAssets = new Set();
      for (const htmlStyle of assetGraph.findRelations({
        from: htmlAsset,
        type: 'HtmlStyle'
      })) {
        if (seenCssAssets.has(htmlStyle.to)) {
          htmlStyle.detach();
        } else {
          seenCssAssets.add(htmlStyle.to);
        }
      }
    }
  };
};
