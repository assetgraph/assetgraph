var _ = require('underscore'),
    seq = require('seq'),
    error = require('../util/error');

module.exports = function (queryObj, encoding) {
    return function setAssetEncoding(assetGraph, cb) {
        seq.ap(assetGraph.findAssets(_.extend({isText: true}, queryObj)))
            .parEach(function (asset) {
                asset.getTargetEncoding(this.into(asset.id));
            })
            .parEach(function (asset) {
                if (this.vars[asset.id] !== encoding) {
                    asset.setEncoding(encoding);
                    assetGraph.markAssetDirty(asset);
                }
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
