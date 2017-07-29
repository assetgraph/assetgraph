const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const Path = require('path');
const constants = process.ENOENT ? process : require('constants');
const mkdirpAsync = Promise.promisify(require('mkdirp'));
const urlTools = require('urltools');

async function mkpathAndWriteFileAsync(fileName, contents, encoding) {
    try {
        await fs.writeFileAsync(fileName, contents, encoding);
    } catch (err) {
        if (err.code === 'ENOENT' || err.errno === constants.ENOENT) {
            await mkdirpAsync(Path.dirname(fileName));
            await fs.writeFileAsync(fileName, contents, encoding);
        } else {
            throw err;
        }
    }
}

module.exports = (queryObj, outRoot, root) => {
    if (outRoot && !outRoot.startsWith('file://')) {
        outRoot = urlTools.fsDirToFileUrl(outRoot);
    }

    return async function writeAssetsToDisc(assetGraph) {
        await Promise.map(assetGraph.findAssets(Object.assign({isInline: false}, queryObj || {})), async asset => {
            let targetUrl;
            let error;

            if (outRoot) {
                targetUrl = urlTools.resolveUrl(outRoot, urlTools.buildRelativeUrl(root || assetGraph.root, asset.url));
            } else {
                targetUrl = asset.url;
            }

            if (asset.fileName === undefined) {
                error = new Error('Missing `fileName` while trying to write file to disc: ' + targetUrl);
                error.asset = asset;
                throw error;
            } else {
                await mkpathAndWriteFileAsync(urlTools.fileUrlToFsPath(targetUrl), asset.rawSrc, null);
            }
        }, {concurrency: 40});
    };
};
