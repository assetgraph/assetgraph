var fs = require('fs'),
    _ = require('underscore'),
    seq = require('seq'),
    fileUtils = require('../fileUtils'),
    error = require('../error'),
    query = require('../query');

module.exports = function (queryObj, outRoot, root) {
    return function writeAssetsToDisc(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq.ap(assetGraph.findAssets(_.extend({url: query.defined}, queryObj || {})))
            .parEach(40, function (asset) {
                assetGraph.getSerializedAsset(asset, this.into(asset.id));
            })
            .parEach(40, function (asset) {
                var targetUrl;
                if (outRoot) {
                    targetUrl = fileUtils.resolveUrl(outRoot, fileUtils.buildRelativeUrl(root || assetGraph.resolver.root, asset.url));
                } else {
                    targetUrl = asset.url;
                }
                fileUtils.mkpathAndWriteFile(fileUtils.fileUrlToFsPath(targetUrl), this.vars[asset.id], null, this);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
