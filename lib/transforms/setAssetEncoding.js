var _ = require('underscore'),
    seq = require('seq'),
    passError = require('../util/passError');

module.exports = function (queryObj, encoding) {
    if (typeof encoding !== 'string') {
        throw new Error("transforms.setAssetEncoding: The 'encoding' parameter is mandatory");
    }
    return function setAssetEncoding(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({isText: true}, queryObj)))
            .parEach(function (asset) {
                asset.getTargetEncoding(this.into(asset.id));
            })
            .parEach(function (asset) {
                if (this.vars[asset.id] !== encoding) {
                    asset.setTargetEncoding(encoding);
                }
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
