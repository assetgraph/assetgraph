var _ = require('underscore'),
    seq = require('seq'),
    error = require('../error');

module.exports = function (queryObj, encoding) {
    return function setAssetEncoding(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq()
            .extend(assetGraph.findAssets(_.extend({isText: true}, queryObj)))
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
