var async = require('async'),
    _ = require('lodash'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    return function gzip(assetGraph, cb) {
        var compress,
            gzipAssets = assetGraph.findAssets(_.extend({isInline: false}, queryObj));

        if (gzipAssets.length > 0) {
            try {
                compress = require('node-zopfli');
            } catch (e) {
                assetGraph.emit('info', new Error('node-zopfli is not available, using less efficient zlib compression'));
                compress = require('zlib');
            }
        }

        async.eachLimit(gzipAssets, 4, function (asset, cb) {
            // http://webmasters.stackexchange.com/questions/31750/what-is-recommended-minimum-object-size-for-gzip-performance-benefits
            if (asset.type === 'SourceMap' || asset.rawSrc.length <= 860) {
                return cb();
            }

            compress.gzip(asset.rawSrc, function (err, gzippedRawSrc) {
                if (err) {
                    assetGraph.emit('error', err);
                } else if (gzippedRawSrc.length < asset.rawSrc.length) {
                    assetGraph.addAsset(new AssetGraph.Asset({
                        url: asset.url.replace(/(?=[\?#]|$)/, '.gz'),
                        rawSrc: gzippedRawSrc
                    }));
                }
                cb();
            });
        }, cb);
    };
};
