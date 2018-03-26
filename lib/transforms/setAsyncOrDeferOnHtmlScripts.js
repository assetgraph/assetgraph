module.exports = (setAsyncAttribute, setDeferAttribute) => {
  return function setAsyncOrDeferOnHtmlScripts(assetGraph) {
    if (setAsyncAttribute || setDeferAttribute) {
      for (const htmlScript of assetGraph.findRelations({
        type: 'HtmlScript'
      })) {
        if (setAsyncAttribute) {
          htmlScript.node.setAttribute('async', 'async');
        }
        if (setDeferAttribute) {
          htmlScript.node.setAttribute('defer', 'defer');
        }
      }
    }
  };
};
