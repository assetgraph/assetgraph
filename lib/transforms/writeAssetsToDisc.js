var _ = require('underscore'),
    seq = require('seq'),
    fsTools = require('../util/fsTools'),
    urlTools = require('../util/urlTools'),
    query = require('../query');

module.exports = function (queryObj, outRoot, root) {
    return function writeAssetsToDisc(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({url: query.isDefined}, queryObj || {})))
            .parEach(40, function (asset) {
                var targetUrl;
                if (outRoot) {
                    targetUrl = urlTools.resolveUrl(outRoot, urlTools.buildRelativeUrl(root || assetGraph.root, asset.url));
                } else {
                    targetUrl = asset.url;
                }
                fsTools.mkpathAndWriteFile(urlTools.fileUrlToFsPath(targetUrl), asset.rawSrc, null, this);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
