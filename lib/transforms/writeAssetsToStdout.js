module.exports = function (queryObj, writeHeader) {
    return function writeAssetsToStdout(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            if (writeHeader) {
                console.log("\n" + asset + ":" + "\n");
            }
            if (asset.isText) {
                console.log(assetGraph.getAssetText(asset));
            } else {
                console.log(assetGraph.getAssetRawSrc(asset).toString('utf-8'));
            }
        });
    };
};
