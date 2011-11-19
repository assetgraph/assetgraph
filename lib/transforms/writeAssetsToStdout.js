module.exports = function (queryObj) {
    return function writeAssetsToStdout(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            process.stdout.write(asset.rawSrc);
        });
    };
};
