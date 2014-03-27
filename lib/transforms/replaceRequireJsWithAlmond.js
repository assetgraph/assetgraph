var errors = require('../errors');

module.exports = function () {
    return function replaceRequireJsWithAlmond(assetGraph) {
        var query = assetGraph.query,

            // Start out with checking if requirejs is being used as a script loader.
            // Almond should not replace requirejs if any require/define statement depends on an external url or uses a js experession
            externalDependencies = assetGraph.findRelations({
                type: query.or('JavaScriptAmdRequire', 'JavaScriptAmdDefine'),
                to: {
                    url: query.not(/^file:/)
                }
            }, true),
            almondRelations = assetGraph.findRelations({
                type: 'HtmlRequireJsAlmondReplacement'
            });

        if (!almondRelations.length) {
            return;
        }

        if (externalDependencies.length) {
            assetGraph.emit('warn', new errors.PreconditionError({
                message: 'Could not replace require.js with almond.js since it is used for external script loading.',
                transform: 'replaceRequireJsWithAlmond'
            }));
        }

        var potentiallyOrphanedAssetsById = {};

        almondRelations.forEach(function (almondRelation) {
            var almond = almondRelation.to;

            potentiallyOrphanedAssetsById[almond.id] = almond;

            assetGraph.findRelations({
                type: 'HtmlScript',
                node: function (node) {
                    return node === almondRelation.node;
                }
            }, true).forEach(function (scriptRelation) {
                if (externalDependencies.length === 0) {
                    potentiallyOrphanedAssetsById[scriptRelation.to.id] = scriptRelation.to;

                    var almondHtmlScript = new assetGraph.HtmlScript({
                        from: scriptRelation.from,
                        to: almond,
                        node: scriptRelation.node
                    });
                    assetGraph.addRelation(almondHtmlScript, 'before', scriptRelation);
                    assetGraph.removeRelation(scriptRelation);
                    almondHtmlScript.refreshHref();
                }

                // Clean up data-almond relation
                almondRelation.detach();
            });
        });

        // Clean up require.js assets if nothing is referring to them any more
        Object.keys(potentiallyOrphanedAssetsById).forEach(function (requireJsAssetId) {
            var requireJsAsset = potentiallyOrphanedAssetsById[requireJsAssetId];
            if (requireJsAsset.incomingRelations.length === 0) {
                assetGraph.removeAsset(requireJsAsset);
            }
        });
    };
};
