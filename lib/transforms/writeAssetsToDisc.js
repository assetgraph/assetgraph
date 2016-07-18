var _ = require('lodash');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var Path = require('path');
var constants = process.ENOENT ? process : require('constants');
var mkdirpAsync = Promise.promisify(require('mkdirp'));
var urlTools = require('urltools');

function mkpathAndWriteFileAsync(fileName, contents, encoding) {
    return fs.writeFileAsync(fileName, contents, encoding).caught(function (err) {
        if (err.code === 'ENOENT' || err.errno === constants.ENOENT) {
            return mkdirpAsync(Path.dirname(fileName)).then(function () {
                return fs.writeFileAsync(fileName, contents, encoding);
            });
        }
    });
}

module.exports = function (queryObj, outRoot, root) {
    if (outRoot && outRoot.indexOf('file://') === -1) {
        outRoot = urlTools.fsDirToFileUrl(outRoot);
    }

    return function writeAssetsToDisc(assetGraph) {
        return Promise.map(assetGraph.findAssets(_.extend({isInline: false}, queryObj || {})), function (asset) {
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
            } else {
                return mkpathAndWriteFileAsync(urlTools.fileUrlToFsPath(targetUrl), asset.rawSrc, null);
            }
        }, {concurrency: 40});
    };
};
