const query = require('../query');

module.exports = (queryObj, root) => {
    let combinedQuery = { type: 'SourceMap' };
    if (queryObj) {
        combinedQuery = query.and(queryObj, combinedQuery);
    }

    return function setSourceMapRoot(assetGraph) {
        for (const sourceMap of assetGraph.findAssets(combinedQuery)) {
            if (root) {
                sourceMap.parseTree.sourceRoot = root;
            } else {
                delete sourceMap.parseTree.sourceRoot;
            }
            for (const sourceMapSource of assetGraph.findRelations({from: sourceMap, type: 'SourceMapSource'}, true)) {
                if (!sourceMapSource.to.isAsset) {
                    // Patch up target url of unpopulated relation
                    sourceMapSource.to.url = assetGraph.resolveUrl(sourceMapSource.baseUrl, sourceMapSource.href);
                }
                sourceMapSource.refreshHref();
            }
        }
    };
};
