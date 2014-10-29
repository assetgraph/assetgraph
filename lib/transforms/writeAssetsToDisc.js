var _ = require('lodash'),
    fs = require('fs'),
    Path = require('path'),
    passError = require('passerror'),
    constants = process.ENOENT ? process : require('constants'),
    mkdirp = require('mkdirp'),
    seq = require('seq'),
    urlTools = require('urltools');

var mkpathAndWriteFile = function (fileName, contents, encoding, cb) {
    fs.writeFile(fileName, contents, encoding, function (err) {
        if (err && (err.code === 'ENOENT' || err.errno === constants.ENOENT)) {
            mkdirp(Path.dirname(fileName), passError(cb, function () {
                fs.writeFile(fileName, contents, encoding, cb);
            }));
        } else {
            cb(err);
        }
    });
};

module.exports = function (queryObj, outRoot, root) {
    if (outRoot && outRoot.indexOf('file://') === -1) {
        outRoot = urlTools.fsDirToFileUrl(outRoot);
    }

    return function writeAssetsToDisc(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({isInline: false}, queryObj || {})))
            .parEach(40, function (asset) {
                var targetUrl,
                    error;

                if (outRoot) {
                    targetUrl = urlTools.resolveUrl(outRoot, urlTools.buildRelativeUrl(root || assetGraph.root, asset.url));
                } else {
                    targetUrl = asset.url;
                }

                if (asset.fileName === undefined) {
                    error = new Error('Missing `fileName` while trying to write file to disc: ' + targetUrl);
                    error.asset = asset;
                    assetGraph.emit('error', error);
                    return this();
                }

                mkpathAndWriteFile(urlTools.fileUrlToFsPath(targetUrl), asset.rawSrc, null, this);
            })
            .seq(function () {
                cb();
            })['catch'](cb);
    };
};
