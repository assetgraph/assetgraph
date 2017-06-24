const _ = require('lodash');

module.exports = (queryObj, encoding) => {
    if (typeof encoding !== 'string') {
        throw new Error('transforms.setAssetEncoding: The \'encoding\' parameter is mandatory');
    }
    console.warn('The setAssetEncoding transform is deprecated, please use updateAssets(queryObj, {encoding: ...}) instead');
    return function setAssetEncoding(assetGraph) {
        for (const asset of assetGraph.findAssets(_.extend({isText: true}, queryObj))) {
            asset.encoding = encoding;
        }
    };
};
