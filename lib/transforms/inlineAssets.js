var step = require('step'),
    error = require('../error');

module.exports = function (queryObj) {
    return function inlineAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        step(
            function () {
                assetGraph.findAssets(queryObj).forEach(function (asset) {
                    assetGraph.inlineAsset(asset, this.parallel());
                }, this);
                process.nextTick(this.parallel()); // In case of no matches
            },
            cb
        );
    };
};
