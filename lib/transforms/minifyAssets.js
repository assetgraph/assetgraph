var seq = require('seq');

module.exports = function (queryObj) {
    return function minifyAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq.ap(assetGraph.findAssets(queryObj))
            .parEach(40, function (asset) {
                if (asset.minify) {
                    asset.minify(this);
                } else {
                    this();
                }
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
