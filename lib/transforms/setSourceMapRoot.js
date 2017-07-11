const query = require('../query');

module.exports = (queryObj, root) => {
    let combinedQuery = { type: 'SourceMap' };
    if (queryObj) {
        combinedQuery = query.and(queryObj, combinedQuery);
    }

    return function setSourceMapRoot(assetGraph) {
        for (const sourceMap of assetGraph.findAssets(combinedQuery)) {
            delete sourceMap.parseTree.sourceRoot;
            const newTargetUrlByAssetId = {};
            for (const sourceMapSource of assetGraph.findRelations({from: sourceMap, type: 'SourceMapSource'}, true)) {
                if (!sourceMapSource.to.isLoaded) {
                    newTargetUrlByAssetId[sourceMapSource.to.id] = assetGraph.resolveUrl(
                        root ? assetGraph.resolveUrl(sourceMapSource.baseUrl, root.replace(/\/?$/, '/')) : sourceMapSource.baseUrl,
                        sourceMapSource.href
                    );
                }
            }
            for (const sourceMapSource of assetGraph.findRelations({from: sourceMap, type: 'SourceMapSource'}, true)) {
                // Patch up target url of unpopulated relation
                var newTargetUrl = newTargetUrlByAssetId[sourceMapSource.to.id];
                if (newTargetUrl) {
                    sourceMapSource.to.url = newTargetUrl;
                }
            }
            if (root) {
                sourceMap.parseTree.sourceRoot = root;
                for (const sourceMapSource of assetGraph.findRelations({from: sourceMap, type: 'SourceMapSource'}, true)) {
                    sourceMapSource.refreshHref();
                }
            }
        }
    };
};
