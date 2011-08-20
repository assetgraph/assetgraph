module.exports = function (queryObj, extension) {
    if (typeof encoding !== 'string') {
        throw new Error("transforms.setAssetExtension: The 'extension' parameter is mandatory (but can be the empty string)");
    }
    return function setAssetEncoding(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            asset.extension = extension;
        });
    };
};
