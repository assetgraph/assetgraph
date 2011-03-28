var step = require('step'),
    error = require('../error');

module.exports = function (queryObj, encoding) {
    return function setAssetEncoding(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        step(
            function () {
                var group = this.group();
                assetGraph.findAssets(queryObj).forEach(function (asset) {
                    var callback = group();
                    asset.getTargetEncoding(error.passToFunction(callback, function (currentTargetEncoding) {
                        if (currentTargetEncoding !== encoding) {
                            asset.setEncoding(encoding);
                            assetGraph.markAssetDirty(asset);
                        }
                        callback();
                    }));
                }, this);
                process.nextTick(this.parallel()); // In case of no matches
            },
            cb
        );
    };
};
