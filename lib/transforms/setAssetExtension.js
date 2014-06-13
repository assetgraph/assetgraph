module.exports = function (queryObj, extension) {
    if (typeof extension !== 'string') {
        throw new Error('transforms.setAssetExtension: The \'extension\' parameter is mandatory (but can be the empty string)');
    }
    console.warn('The setAssetExtension transform is deprecated, please use updateAsset(queryObj, {extension: ...}) instead');
    return function setAssetExtension(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            asset.extension = extension;
        });
    };
};
