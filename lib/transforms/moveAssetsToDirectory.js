var transforms = require('../transforms');

exports.moveAssetsToDirectory = function (queryObj, url) {
    return function moveAssetsToDirectory(assetGraph, cb) {
        if (/^\//.test(url)) {
            url = assetGraph.resolver.root + url.substr(1);
        }
        if (!/\/$/.test(url)) {
            url += '/';
        }
        transforms.moveAssets(queryObj, function (asset) {
            return url + asset.id + '.' + asset.defaultExtension;
        })(assetGraph, cb);
    };
};
