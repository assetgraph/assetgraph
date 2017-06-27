module.exports = (queryObj, contentType) => {
    if (typeof encoding !== 'string') {
        throw new Error('transforms.setContentType: The \'contentType\' parameter is mandatory');
    }
    console.warn('The setAssetContentType transform is deprecated, please use updateAsset(queryObj, {contentType: ...}) instead');
    return function setContentType(assetGraph) {
        for (const asset of assetGraph.findAssets(queryObj)) {
            asset.contentType = contentType;
        }
    };
};
