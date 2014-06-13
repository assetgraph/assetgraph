var _ = require('lodash');

module.exports = function (queryObj, encoding) {
    if (typeof encoding !== 'string') {
        throw new Error('transforms.setAssetEncoding: The \'encoding\' parameter is mandatory');
    }
    console.warn('The setAssetEncoding transform is deprecated, please use updateAsset(queryObj, {encoding: ...}) instead');
    return function setAssetEncoding(assetGraph) {
        assetGraph.findAssets(_.extend({isText: true}, queryObj)).forEach(function (asset) {
            asset.encoding = encoding;
        });
    };
};
