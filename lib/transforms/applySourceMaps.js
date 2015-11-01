var _ = require('lodash');

module.exports = function (queryObj) {
    return function applySourceMaps(assetGraph) {
        assetGraph.findAssets(queryObj || { type: [ 'JavaScript', 'Css' ] }).forEach(function (asset) {
            var sourceMappingUrl = assetGraph.findRelations({ from: asset, type: /SourceMappingUrl$/, to: { type: 'SourceMap', isLoaded: true } })[0];
            if (sourceMappingUrl) {
                if (asset.parseTree) {
                    // Absolutify urls in sources array before applying:
                    var shallowCopy = _.extend({}, sourceMappingUrl.to.parseTree);
                    if (Array.isArray(shallowCopy.sources)) {
                        var nonInlineAncestorUrl = sourceMappingUrl.to.nonInlineAncestor.url;
                        shallowCopy.sources = shallowCopy.sources.map(function (sourceUrl) {
                            return assetGraph.resolveUrl(nonInlineAncestorUrl, sourceUrl);
                        });
                    }
                    asset.sourceMap = shallowCopy;
                }
            }
        });
    };
};
