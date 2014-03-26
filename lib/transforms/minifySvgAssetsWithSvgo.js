/*global setImmediate:true*/
// node 0.8 compat
if (typeof setImmediate === 'undefined') {
    setImmediate = process.nextTick;
}

var path = require('path'),
    _ = require('underscore'),
    async = require('async'),
    urlTools = require('urltools'),
    passError = require('passerror'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    return function minifySvgAssetsWithSvgo(assetGraph, cb) {
        var Svgo,
            svgAssets = assetGraph.findAssets(_.extend({type: 'Svg'}, queryObj));
        if (svgAssets.length > 0) {
            try {
                Svgo = require('svgo');
            } catch (e) {
                assetGraph.emit('warn', new Error('minifySvgAssetsWithSvgo: Found ' + svgAssets.length + ' svg asset(s), but no svgo module is available. Please install svgo in your project so minifySvgAssetsWithSvgo can require it.'));
                return setImmediate(cb);
            }
        }
        async.each(svgAssets, function (svgAsset, cb) {
            new Svgo().optimize(svgAsset.text, function (result) {
                svgAsset.text = result.data;
                cb();
            });
        }, cb);
    };
};
