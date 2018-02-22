module.exports = (queryObj, media) => {
  const includeByMedium = {};
  if (!media) {
    includeByMedium.all = true;
  } else {
    for (const medium of media.split(',')) {
      includeByMedium[medium.replace(/^\s+|\s+$/g, '')] = true;
    }
  }
  function includeMedia(media) {
    return (
      includeByMedium.all ||
      media.some(medium => {
        medium = medium.replace(/^\s+|\s+$/g, '');
        return medium === 'all' || includeByMedium[medium];
      })
    );
  }

  return function convertStylesheetsToInlineStyles(assetGraph) {
    for (const htmlAsset of assetGraph.findAssets(
      Object.assign({ isHtml: true }, queryObj)
    )) {
      const document = htmlAsset.parseTree;
      assetGraph.eachAssetPostOrder(
        htmlAsset,
        relation => {
          if (relation.type === 'HtmlStyle' || relation.type === 'CssImport') {
            let relationMedia = ['all'];
            if (relation.type === 'HtmlStyle') {
              relationMedia = (
                relation.node.getAttribute('media') || 'all'
              ).split(',');
            } else if (relation.type === 'CssImport') {
              const mediaStr = relation.media;
              if (mediaStr) {
                relationMedia = mediaStr.split(' ');
              }
            }
            if (includeMedia(relationMedia)) {
              return true;
            } else {
              relation.detach();
              if (relation.to.incomingRelations.length === 0) {
                assetGraph.removeAsset(relation.to);
              }
            }
          }
          return false;
        },
        (cssAsset, incomingRelation) => {
          if (cssAsset.type === 'Css') {
            cssAsset.eachRuleInParseTree(cssRule => {
              if (cssRule.type === 'rule') {
                for (const node of Array.from(
                  document.querySelectorAll(cssRule.selector)
                )) {
                  if (
                    node.nodeName.toLowerCase() === 'style' ||
                    node === document.head ||
                    node.parentNode === document.head
                  ) {
                    continue;
                  }
                  let htmlStyleAttributeRelation = assetGraph.findRelations({
                    from: htmlAsset,
                    type: 'HtmlStyleAttribute',
                    node: _node => _node === node
                  })[0];

                  if (!htmlStyleAttributeRelation) {
                    htmlStyleAttributeRelation = htmlAsset.addRelation({
                      type: 'HtmlStyleAttribute',
                      node,
                      to: {
                        type: 'Css',
                        text: 'bogusselector {}'
                      }
                    });
                  }
                  const inlineCssAsset = htmlStyleAttributeRelation.to;
                  const styleRuleIndex = inlineCssAsset.parseTree.nodes.length;

                  inlineCssAsset.parseTree.nodes[0].append(
                    cssRule.nodes.map(node => {
                      return node.clone({
                        raws: {
                          before: ' ',
                          between: (node.raws && node.raws.between) || ': '
                        }
                      });
                    })
                  );
                  for (const cssRelation of assetGraph.findRelations({
                    from: cssAsset,
                    // FIXME: Update query module to check whether object.prototype === Object and use identity otherwise
                    node: _node => _node === node
                  })) {
                    inlineCssAsset.addRelation({
                      type: cssRelation.type,
                      parentNode: inlineCssAsset.parseTree,
                      node: inlineCssAsset.parseTree.nodes[0],
                      propertyNode:
                        inlineCssAsset.parseTree.nodes[styleRuleIndex],
                      to: cssRelation.to
                    });
                  }
                  inlineCssAsset.markDirty();
                }
              } else if (
                cssRule.type === 'atrule' &&
                cssRule.name === 'media'
              ) {
                if (!includeMedia(cssRule.params.split(' '))) {
                  return false;
                }
              }
            });
            incomingRelation.detach();
            if (cssAsset.incomingRelations.length === 0) {
              assetGraph.removeAsset(cssAsset);
            }
          }
        }
      );
    }
  };
};
