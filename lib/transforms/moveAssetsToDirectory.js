var transforms = require('../transforms');

module.exports = function (queryObj, url) {
    return function moveAssetsToDirectory(assetGraph, cb) {
        if (/^\//.test(url)) {
            url = assetGraph.root + url.substr(1);
        }
        if (!/\/$/.test(url)) {
            url += '/';
        }
        transforms.moveAssets(queryObj, function (asset) {
            return url + asset.id + asset.getExtension();
        })(assetGraph, cb);
    };
};
