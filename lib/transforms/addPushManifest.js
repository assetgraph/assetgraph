/**
 * Adds a google app engine compatible push manifest file to the graph.
 * See https://github.com/GoogleChrome/http2-push-manifest
 */

var pathModule = require('path');

module.exports = function (queryObj) {
    return function (assetGraph) {
        var manifest = {};

        var manifestRelevanceMatcher = assetGraph.query.createValueMatcher({
            pushType: function (type) { return type; }, // not undefined
            isInline: false
        });

        assetGraph.findAssets({ type: 'Html', isInline: false }).forEach(function (htmlAsset) {
            var htmlAssetPath = pathModule.relative(assetGraph.root, htmlAsset.url);

            assetGraph.eachAssetPreOrder(htmlAsset, {
                type: assetGraph.query.not('HtmlAnchor'),
                crossorigin: false
            }, function (asset) {
                if (asset === htmlAsset) {
                    // Avoid nested listing of identical html asset
                    return;
                }

                if (manifestRelevanceMatcher(asset)) {
                    var assetPath = pathModule.relative(assetGraph.root, asset.url);


                    if (!manifest[htmlAssetPath]) {
                        manifest[htmlAssetPath] = {};
                    }

                    manifest[htmlAssetPath][assetPath] = {
                        type: asset.pushType,
                        weight: 1 // FIXME
                    };
                }
            });
        });

        assetGraph.addAsset(new assetGraph.Json({
            url: pathModule.join(assetGraph.root, 'push_mainfest.json'),
            text: JSON.stringify(manifest, undefined, 2)
        }));
    };
};
