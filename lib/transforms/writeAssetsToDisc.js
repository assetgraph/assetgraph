var _ = require('underscore'),
    seq = require('seq'),
    fsTools = require('../util/fsTools'),
    urlTools = require('../util/urlTools'),
    passError = require('../util/passError'),
    query = require('../query');

module.exports = function (queryObj, outRoot, root) {
    return function writeAssetsToDisc(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({url: query.isDefined}, queryObj || {})))
            .parEach(40, function (asset) {
                assetGraph.getSerializedAsset(asset, this.into(asset.id));
            })
            .parEach(40, function (asset) {
                var targetUrl;
                if (outRoot) {
                    targetUrl = urlTools.resolveUrl(outRoot, urlTools.buildRelativeUrl(root || assetGraph.root, asset.url));
                } else {
                    targetUrl = asset.url;
                }
                fsTools.mkpathAndWriteFile(urlTools.fileUrlToFsPath(targetUrl), this.vars[asset.id], null, this);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
