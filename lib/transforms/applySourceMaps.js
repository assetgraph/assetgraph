var sourceMapToAst = require('sourcemap-to-ast');
var _ = require('lodash');

module.exports = function () {
    return function applySourceMaps(assetGraph) {
        assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
            var sourceMappingUrl = assetGraph.findRelations({ from: javaScript, type: 'JavaScriptSourceMappingUrl', to: { isLoaded: true } })[0];
            if (sourceMappingUrl) {
                if (javaScript.parseTree) {
                    // Absolutify urls in sources array before applying:
                    var shallowCopy = _.extend({}, sourceMappingUrl.to.parseTree);
                    if (Array.isArray(shallowCopy.sources)) {
                        var nonInlineAncestorUrl = sourceMappingUrl.to.nonInlineAncestor.url;
                        shallowCopy.sources = shallowCopy.sources.map(function (sourceUrl) {
                            return assetGraph.resolveUrl(nonInlineAncestorUrl, sourceUrl);
                        });
                    }
                    sourceMapToAst(javaScript.parseTree, shallowCopy);
                }
            }
        });
    };
};
