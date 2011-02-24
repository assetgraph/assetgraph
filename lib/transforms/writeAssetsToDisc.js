var fs = require('fs'),
    URL = require('url'),
    _ = require('underscore'),
    step = require('step'),
    fileUtils = require('../fileUtils'),
    error = require('../error'),
    query = require('../query');

exports.writeAssetsToDisc = function (queryObj, outRoot, root) {
    return function writeAssetsToDisc(err, assetGraph, cb) {
        var assets = assetGraph.findAssets(_.extend({url: query.defined}, queryObj || {}));
        if (!assets.length) {
            return process.nextTick(cb);
        }

        step(
            function () {
                var group = this.group();
                assets.forEach(function (asset) {
                    assetGraph.serializeAsset(asset, group());
                });
            },
            function (err, assetSrcs) {
                assetSrcs.forEach(function (src, i) {
                    var asset = assets[i],
                        targetUrl;
                    if (outRoot) {
                        targetUrl = URL.resolve(outRoot, fileUtils.buildRelativeUrl(root || assetGraph.resolver.root, asset.url));
                    } else {
                        targetUrl = asset.url;
                    }
                    fileUtils.mkpathAndWriteFile(fileUtils.fileUrlToFsPath(targetUrl), src, asset.encoding, this.parallel());
                }, this);
            },
            cb
        );
    };
};
