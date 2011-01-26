var fs = require('fs'),
    step = require('step'),
    error = require('../error'),
    fileUtils = require('../fileUtils');

exports.writeInitialAssetsBackToDisc = function writeInitialAssetsBackToDisc() {
    return function (siteGraph, cb) {
        step(
            function () {
                siteGraph.findAssets('isInitial', true).forEach(function (asset) {
                    var callback = this.parallel();
                    asset.serialize(error.throwException(function (src) {
                        fs.writeFile(fileUtils.fileUrlToFsPath(asset.url).replace(/\.template$/, ''), src, asset.encoding, callback);
                    }));
                }, this);
            },
            cb
        );
    };
};
