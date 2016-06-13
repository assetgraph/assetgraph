var _ = require('lodash'),
    fs = require('fs'),
    Path = require('path'),
    passError = require('passerror'),
    constants = process.ENOENT ? process : require('constants'),
    mkdirp = require('mkdirp'),
    async = require('async'),
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
        async.eachLimit(assetGraph.findAssets(_.extend({isInline: false}, queryObj || {})), 40, function (asset, cb) {
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
                return cb();
            }

            mkpathAndWriteFile(urlTools.fileUrlToFsPath(targetUrl), asset.rawSrc, null, cb);
        }, cb);
    };
};
