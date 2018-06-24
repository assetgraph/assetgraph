// If the graph contains a favicon.ico at the root, make sure that all Html assets reference it explicitly so that
// it can be moved to the static dir and served with a far-future expires. Still, keep a copy at /favicon.ico for
// old IE versions.

module.exports = queryObj => {
  return function duplicateFavicon(assetGraph) {
    const rootFavicon = assetGraph.findAssets({
      url: `${assetGraph.root}favicon.ico`
    })[0];
    for (const htmlAsset of assetGraph.findAssets(
      Object.assign(
        { type: 'Html', isInline: false, isFragment: false, isLoaded: true },
        queryObj
      )
    )) {
      if (
        rootFavicon &&
        assetGraph.findRelations({ from: htmlAsset, type: 'HtmlShortcutIcon' })
          .length === 0
      ) {
        htmlAsset.addRelation(
          {
            type: 'HtmlShortcutIcon',
            to: rootFavicon
          },
          'lastInHead'
        );
      }
    }
    if (rootFavicon) {
      const incomingRelations = assetGraph
        .findRelations({ to: rootFavicon })
        .filter(relation => relation.to.isLoaded);
      if (incomingRelations.length > 0) {
        const rootFaviconCopy = rootFavicon.clone(incomingRelations);
        rootFaviconCopy.fileName = 'favicon.copy.ico';
        rootFaviconCopy.isInitial = false;
      }
    }
  };
};
