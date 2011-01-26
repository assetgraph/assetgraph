var step = require('step');

exports.minifyAssets = function minifyAssets() {
    return function (siteGraph, cb) {
        step(
            function () {
                siteGraph.assets.forEach(function (asset) {
                    if (asset.minify) {
                        asset.minify(this.parallel());
                    }
                }, this);
                process.nextTick(this.parallel());
            },
            cb
        );
    };
};
