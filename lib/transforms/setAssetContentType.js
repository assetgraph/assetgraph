var _ = require('underscore');

module.exports = function (queryObj, contentType) {
    if (typeof encoding !== 'string') {
        throw new Error('transforms.setContentType: The \'contentType\' parameter is mandatory');
    }
    return function setContentType(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            asset.contentType = contentType;
        });
    };
};
