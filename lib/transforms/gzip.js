var Promise = require('bluebird');
var  _ = require('lodash');
var AssetGraph = require('../AssetGraph');

module.exports = function (queryObj) {
    return function gzip(assetGraph) {
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

        return Promise.map(gzipAssets, function (asset) {
            // http://webmasters.stackexchange.com/questions/31750/what-is-recommended-minimum-object-size-for-gzip-performance-benefits
            if (asset.type !== 'SourceMap' && asset.rawSrc.length > 860) {
                return Promise.fromNode(function (cb) {
                    compress.gzip(asset.rawSrc, cb);
                }).then(function (gzippedRawSrc) {
                    if (gzippedRawSrc.length < asset.rawSrc.length) {
                        assetGraph.addAsset(new AssetGraph.Asset({
                            url: asset.url.replace(/(?=[\?#]|$)/, '.gz'),
                            rawSrc: gzippedRawSrc
                        }));
                    }
                }, function (err) {
                    assetGraph.emit('error', err);
                });
            }
        }, {concurrency: 4});
    };
};
