var fs = require('fs'),
    constants = process.ENOENT ? process : require('constants'),
    glob = require('glob'),
    passError = require('../util/passError');

module.exports = function () {
    return function file(assetConfig, fromUrl, cb) {
        var pathname = assetConfig.url
            .replace(/^\w+:(?:\/\/)?/, "") // Strip protocol and two leading slashes if present
            .replace(/[?#].*$/, ''); // Strip CGI parameters and/or fragment identifier
        if (/\*|\{.*\}/.test(pathname)) {
            // Expand wildcard, then expand each resulting url
            return glob(pathname, passError(cb, function (fsPaths) {
                if (!fsPaths.length) {
                    cb(new Error("resolvers.file: Wildcard " + pathname + " expanded to nothing"));
                } else {
                    cb(null, fsPaths.map(function (fsPath) {
                        return 'file://' + fsPath;
                    }));
                }
            }));
        }
        assetConfig.rawSrcProxy = function (cb) {
            fs.readFile(pathname, null, function (err, rawSrc) {
                if (err) {
                    if (err.code === 'EISDIR' || err.errno === constants.EISDIR || err.code === 'EINVAL' || err.errno === constants.EINVAL) {
                        fs.readFile(pathname.replace(/(\/)?$/, '/index.html'), passError(cb, function (rawSrc) {
                            cb(null, rawSrc, {
                                url: assetConfig.url.replace(/(\/)?((?:[?#].*$)|$)/, '/index.html$2')
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
        process.nextTick(function () {
            cb(null, assetConfig);
        });
    };
};
