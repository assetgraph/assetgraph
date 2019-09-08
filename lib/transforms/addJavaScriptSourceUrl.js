module.exports = queryObj => {
  return function addJavaScriptSourceUrl(assetGraph) {
    for (const javaScript of assetGraph.findAssets({
      type: 'JavaScript',
      ...queryObj
    })) {
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
