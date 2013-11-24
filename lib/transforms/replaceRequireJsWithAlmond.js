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

        almondRelations.forEach(function (almondRelation) {
            var almond = almondRelation.to;

            assetGraph.findRelations({
                type: 'HtmlScript',
                node: function (node) {
                    return node === almondRelation.node;
                }
            }, true).forEach(function (scriptRelation) {
                if (externalDependencies.length === 0) {
                    var requireAsset = scriptRelation.to;

                    // Replace requirejs asset with almond
                    assetGraph.removeRelation(scriptRelation);
                    scriptRelation.to = almondRelation.to;
                    scriptRelation.href = almondRelation.href;
                    assetGraph.addRelation(scriptRelation);

                    // Clean up requirejs asset if noone is referring to it any more
                    if (requireAsset.incomingRelations.length === 0) {
                        assetGraph.removeAsset(requireAsset);
                    }
                }

                // Clean up data-almond relations
                almondRelation.detach();
                if (almond.incomingRelations.length === 0) {
                    assetGraph.removeAsset(almond);
                }
            });
        });
    };
};
