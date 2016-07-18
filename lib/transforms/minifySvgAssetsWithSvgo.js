var _ = require('lodash');
var Promise = require('bluebird');

module.exports = function (queryObj) {
    return function minifySvgAssetsWithSvgo(assetGraph) {
        var Svgo,
            svgAssets = assetGraph.findAssets(_.extend({type: 'Svg'}, queryObj));
        if (svgAssets.length > 0) {
            try {
                Svgo = require('svgo');
            } catch (e) {
                assetGraph.emit('info', new Error('minifySvgAssetsWithSvgo: Found ' + svgAssets.length + ' svg asset(s), but no svgo module is available. Please use npm to install svgo in your project so minifySvgAssetsWithSvgo can require it.'));
                return;
            }
        }
        return Promise.map(svgAssets, function (svgAsset) {
            return Promise.fromNode(function (cb) {
                // svgo both calls the callback with an error _and_ throws if it encounters and error
                var callbackCalled = false;
                try {
                    new Svgo().optimize(svgAsset.text, function (result) {
                        callbackCalled = true;
                        if (result.error) {
                            assetGraph.emit('warn', new Error('SVG optimization error in ' + svgAsset.urlOrDescription + '\nOptimiztion skipped.\n' + result.error));
                        } else {
                            svgAsset.text = result.data;
                        }
                        cb();
                    });
                } catch (e) {
                    if (!callbackCalled) {
                        // Error not already handled in callback
                        assetGraph.emit('warn', new Error('svgo threw a hissyfit in ' + svgAsset.urlOrDescription + '\n' + e.stack));
                        cb();
                    }
                }
            });
        });
    };
};
