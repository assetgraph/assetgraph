var urlTools = require('../util/urlTools'),
    errors = require('../errors');

module.exports = function () {
    return function replaceRequireJsWithAlmond(assetGraph) {
        var replacedAssets = [],
            removedAlmonds = [],
            query = assetGraph.query,

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
        } else {
            almondRelations.forEach(function (almondRelation) {
                assetGraph.findRelations({
                    type: 'HtmlScript',
                    node: function (node) {
                        return node === almondRelation.node;
                    }
                }, true).forEach(function (scriptRelation) {
                    if (replacedAssets.indexOf(scriptRelation.to.url) === -1) {
                        var replacement = new assetGraph.JavaScript({
                                text: almondRelation.to.text
                            });

                        scriptRelation.to.replaceWith(replacement);

                        replacedAssets.push(replacement.url);
                    }
                });
            });
        }

        almondRelations.forEach(function (almondRelation) {
            var almond = almondRelation.to;

            if (removedAlmonds.indexOf(almond.url) === -1) {
                removedAlmonds.push(almond.url);
                assetGraph.removeAsset(almond, true);
            }
        });
    };
};
