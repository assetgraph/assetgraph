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
                // The removeUnknownsAndDefaults SVGO plugin strips top-level attributes of the <svg> element
                // that could be important. Note down all the attributes so they can be re-attached after the optimization
                // https://github.com/svg/svgo/issues/301
                var originalTopLevelAttributes = {};
                if (svgAsset.isInline) {
                    Array.prototype.forEach.call(svgAsset.parseTree.documentElement.attributes, function (attribute) {
                        originalTopLevelAttributes[attribute.name] = attribute.value;
                    });
                }

                // svgo both calls the callback with an error _and_ throws if it encounters and error
                var callbackCalled = false;
                try {
                    new Svgo({
                        floatPrecision: 6 // The default of 2 is so low that it's visibly lossy in some cases
                    }).optimize(svgAsset.text, function (result) {
                        callbackCalled = true;
                        if (result.error) {
                            assetGraph.emit('warn', new Error('SVG optimization error in ' + svgAsset.urlOrDescription + '\nOptimiztion skipped.\n' + result.error));
                        } else {
                            svgAsset.text = result.data;
                            if (svgAsset.isInline) {
                                var dirty = false;
                                Object.keys(originalTopLevelAttributes).forEach(function (attributeName) {
                                    if (!svgAsset.parseTree.documentElement.hasAttribute(attributeName)) {
                                        svgAsset.parseTree.documentElement.setAttribute(attributeName, originalTopLevelAttributes[attributeName]);
                                        dirty = true;
                                    }
                                });
                                if (dirty) {
                                    svgAsset.markDirty();
                                }
                            }
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
