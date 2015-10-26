module.exports = function (options) {
    options = options || {};
    var mode = options.mode || 'polyfill';
    return function removeOrPolyfillSystemJs(assetGraph) {
        var systemJsPolyfillRelations = assetGraph.findRelations({
            type: 'HtmlSystemJsPolyfill'
        });

        var potentiallyOrphanedAssetsById = {};

        systemJsPolyfillRelations.forEach(function (systemJsPolyfillRelation) {
            var systemJsPolyfill = systemJsPolyfillRelation.to;

            potentiallyOrphanedAssetsById[systemJsPolyfill.id] = systemJsPolyfill;

            assetGraph.findRelations({
                type: 'HtmlScript',
                node: function (node) {
                    return node === systemJsPolyfillRelation.node;
                }
            }, true).forEach(function (scriptRelation) {
                potentiallyOrphanedAssetsById[scriptRelation.to.id] = scriptRelation.to;
                if (mode === 'polyfill') {
                    var polyfillHtmlScript = new assetGraph.HtmlScript({to: systemJsPolyfill, hrefType: scriptRelation.hrefType});
                    polyfillHtmlScript.attach(scriptRelation.from, 'before', scriptRelation);
                    scriptRelation.from.markDirty();
                } else {
                    potentiallyOrphanedAssetsById[scriptRelation.to.id] = scriptRelation.to;
                }

                // Clean up data-systemjs-polyfill relation
                systemJsPolyfillRelation.detach();
            });
        });

        // Clean up system.js assets if nothing is referring to them any more
        Object.keys(potentiallyOrphanedAssetsById).forEach(function (systemJsAssetId) {
            var systemJsAsset = potentiallyOrphanedAssetsById[systemJsAssetId];
            if (systemJsAsset.incomingRelations.length === 0) {
                assetGraph.removeAsset(systemJsAsset);
            }
        });
    };
};
