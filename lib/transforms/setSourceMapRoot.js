var query = require('../query');

module.exports = function (queryObj, root) {
    var combinedQuery = {type: 'SourceMap'};
    if (queryObj) {
        combinedQuery = query.and(queryObj, combinedQuery);
    }

    return function setSourceMapRoot(assetGraph) {
        assetGraph.findAssets(combinedQuery).forEach(function (mapFile) {
            if (root) {
                mapFile.parseTree.sourceRoot = root;
            } else {
                delete mapFile.parseTree.sourceRoot;
            }
            assetGraph.findRelations({from: mapFile, type: 'SourceMapSource'}, true).forEach(function (sourceMapSource) {
                if (!sourceMapSource.to.isAsset) {
                    // Patch up target url of unpopulated relation
                    sourceMapSource.to.url = assetGraph.resolveUrl(sourceMapSource.baseUrl, sourceMapSource.href);
                }
                sourceMapSource.refreshHref();
            });
        });
    };
};
