var _ = require('underscore'),
    seq = require('seq'),
    query = require('../query');

module.exports = function (queryObj) {
    return function externalizeAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        assetGraph.findAssets(_.extend({url: query.undefined}, queryObj)).forEach(function (asset) {
            assetGraph.setAssetUrl(asset, assetGraph.resolver.root + asset.id + '.' + asset.defaultExtension);
        });
        process.nextTick(cb);
    };
};
