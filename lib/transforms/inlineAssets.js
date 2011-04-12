var seq = require('seq'),
    error = require('../error');

module.exports = function (queryObj) {
    return function inlineAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq()
            .extend(assetGraph.findAssets(queryObj))
            .parEach(function (asset) {
                assetGraph.inlineAsset(asset, this);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
