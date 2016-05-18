// If the graph contains a favicon.ico at the root, make sure that all Html assets reference it explicitly so that
// it can be moved to the static dir and served with a far-future expires. Still, keep a copy at /favicon.ico for
// old IE versions.

var _ = require('lodash');

module.exports = function (queryObj) {
    return function duplicateFavicon(assetGraph) {
        var rootFavicon = assetGraph.findAssets({url: assetGraph.root + 'favicon.ico'})[0];
        assetGraph.findAssets(_.extend({type: 'Html', isInline: false, isFragment: false}, queryObj)).forEach(function (htmlAsset) {
            if (rootFavicon && assetGraph.findRelations({from: htmlAsset, type: 'HtmlShortcutIcon'}).length === 0) {
                new assetGraph.HtmlShortcutIcon({to: rootFavicon}).attach(htmlAsset);
            }
        });
        if (rootFavicon) {
            var incomingRelations = assetGraph.findRelations({to: rootFavicon});
            if (incomingRelations.length > 0) {
                var rootFaviconCopy = rootFavicon.clone(incomingRelations);
                rootFaviconCopy.fileName = 'favicon.copy.ico';
                rootFaviconCopy.isInitial = false;
            }
        }
    };
};
