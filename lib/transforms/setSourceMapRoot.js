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
        });
    };
};
