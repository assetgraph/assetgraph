var urlTools = require('../util/urlTools');

module.exports = function () {
    return function replaceRequireJsWithAlmond(assetGraph) {
        var replacedAssets = [],
            removedAlmonds = [];

        assetGraph.findRelations({
            type: 'HtmlRequireJsAlmondReplacement'
        }).forEach(function (almondRelation) {
            var document = almondRelation.from.parseTree.documentElement,
                almondScriptElements = document.querySelectorAll('[data-almond]'),
                almond = almondRelation.to;

            Array.prototype.forEach.call(almondScriptElements, function (el) {
                assetGraph.findAssets({
                    type: 'JavaScript',
                    url: urlTools.resolveUrl(almondRelation.from.url, el.src)
                }).forEach(function (requireJsAsset) {
                    // TODO: Check AST to see if we actually have the correct content

                    if (replacedAssets.indexOf(requireJsAsset.url) === -1) {
                        var replacement = new assetGraph.JavaScript({
                                text: almondRelation.to.text
                            });

                        requireJsAsset.replaceWith(replacement);

                        replacedAssets.push(replacement.url);
                    }
                });
            });

            if (removedAlmonds.indexOf(almond.url) === -1) {
                removedAlmonds.push(almond.url);
                assetGraph.removeAsset(almond, true);
            }
        });
    };
};
