var _ = require('underscore'),
    seq = require('seq'),
    passError = require('../util/passError');

module.exports = function (queryObj, encoding) {
    return function setAssetEncoding(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({isText: true}, queryObj)))
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
