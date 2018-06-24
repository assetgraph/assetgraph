module.exports = queryObj => {
  return function convertHtmlStylesToInlineCssImports(assetGraph) {
    let currentInlineCssAsset;
    for (const htmlAsset of assetGraph.findAssets(
      Object.assign({ type: 'Html' }, queryObj)
    )) {
      for (const htmlStyle of assetGraph.findRelations({
        type: 'HtmlStyle',
        from: htmlAsset
      })) {
        if (!htmlStyle.to.url) {
          // Skip already inline stylesheet
          currentInlineCssAsset = null;
          return;
        }
        if (
          !currentInlineCssAsset ||
          assetGraph.findRelations({ from: currentInlineCssAsset }).length > 31
        ) {
          currentInlineCssAsset = htmlAsset.addRelation(
            {
              type: 'HtmlStyle',
              to: {
                type: 'Css',
                isDirty: true,
                text: ''
              }
            },
            'before',
            htmlStyle
          ).to;
        }
        const mediaText = htmlStyle.node.getAttribute('media');
        currentInlineCssAsset.parseTree.append(
          `@import ""${mediaText ? ` ${mediaText}` : ''}`
        );
        const cssImportRule = currentInlineCssAsset.parseTree.last;

        currentInlineCssAsset.addRelation(
          {
            to: htmlStyle.to,
            node: cssImportRule,
            hrefType: htmlStyle.hrefType
          },
          'last'
        );
        htmlStyle.detach();
      }
    }
  };
};
