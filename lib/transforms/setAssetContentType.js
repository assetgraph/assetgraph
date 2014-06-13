module.exports = function (queryObj, contentType) {
    if (typeof encoding !== 'string') {
        throw new Error('transforms.setContentType: The \'contentType\' parameter is mandatory');
    }
    console.warn('The setAssetContentType transform is deprecated, please use updateAsset(queryObj, {contentType: ...}) instead');
    return function setContentType(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            asset.contentType = contentType;
        });
    };
};
