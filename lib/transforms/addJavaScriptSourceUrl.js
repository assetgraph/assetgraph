module.exports = () => {
  return function addJavaScriptSourceUrl(assetGraph) {
    for (const javaScript of assetGraph.findAssets({ type: 'JavaScript' })) {
      javaScript.addRelation(
        {
          type: 'JavaScriptSourceUrl',
          to: javaScript,
          hrefType: 'rootRelative'
        },
        'last'
      );
    }
  };
};
