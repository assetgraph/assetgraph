var _ = require('underscore');

module.exports = function (queryObj, encoding) {
    if (typeof encoding !== 'string') {
        throw new Error('transforms.setAssetEncoding: The \'encoding\' parameter is mandatory');
    }
    return function setAssetEncoding(assetGraph) {
        assetGraph.findAssets(_.extend({isText: true}, queryObj)).forEach(function (asset) {
            asset.encoding = encoding;
        });
    };
};
