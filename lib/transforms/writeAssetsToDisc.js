var fs = require('fs'),
    URL = require('url'),
    step = require('step'),
    fileUtils = require('../fileUtils'),
    error = require('../error');

exports.writeAssetsToDisc = function (outRoot) {
    return function writeAssetsToDisc(siteGraph, cb) {
        var assetsToWrite = siteGraph.assets.filter(function (asset) {return !!asset.url;});

        if (!assetsToWrite.length) {
            return process.nextTick(cb);
        }

        step(
            function () {
                var group = this.group();
                assetsToWrite.forEach(function (asset) {
                    asset.serialize(group());
                });
            },
            function (err, assetSrcs) {
                assetSrcs.forEach(function (src, i) {
                    var asset = assetsToWrite[i];
                    fs.writeFile(fileUtils.fileUrlToFsPath(URL.resolve(outRoot, fileUtils.buildRelativeUrl(siteGraph.root, asset.url))), src, asset.encoding, this.parallel());
                }, this);
            },
            cb
        );
    };
};
