var fs = require('fs'),
    constants = process.ENOENT ? process : require('constants'),
    glob = require('glob'),
    urlTools = require('urltools'),
    passError = require('passerror');

module.exports = function () {
    return function file(assetConfig, fromUrl, cb) {
        var pathname = urlTools.fileUrlToFsPath(assetConfig.url),
            matchQueryStringAndFragmentIdentifier = assetConfig.url.match(/([?#].*)$/),
            queryStringAndFragmentIdentifier = matchQueryStringAndFragmentIdentifier ? matchQueryStringAndFragmentIdentifier[1] : '';
        if (/\*|\{.*\}/.test(pathname)) {
            // Expand wildcard, then expand each resulting url
            return glob(pathname, passError(cb, function (fsPaths) {
                cb(null, fsPaths.map(function (fsPath) {
                    return urlTools.fsFilePathToFileUrl(fsPath) + queryStringAndFragmentIdentifier;
                }));
            }));
        }
        assetConfig.rawSrcProxy = function (cb) {
            // In case assetConfig.url was updated in the mean time
            var url = this.url;
            var pathname = urlTools.fileUrlToFsPath(url);
            fs.readFile(pathname, null, function (err, rawSrc) {
                if (err) {
                    if (err.code === 'EISDIR' || err.errno === constants.EISDIR || err.code === 'EINVAL' || err.errno === constants.EINVAL) {
                        fs.readFile(pathname.replace(/(\/)?$/, '/index.html'), passError(cb, function (rawSrc) {
                            cb(null, rawSrc, {
                                url: url.replace(/(\/)?((?:[?#].*$)|$)/, '/index.html$2')
                            });
                        }));
                    } else {
                        cb(err);
                    }
                } else {
                    cb(null, rawSrc);
                }
            });
        };
        assetConfig.isResolved = true;
        setImmediate(function () {
            cb(null, assetConfig);
        });
    };
};
