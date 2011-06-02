var fs = require('fs'),
    glob = require('glob'),
    passError = require('../util/passError');

module.exports = function () {
    return function file(assetConfig, fromUrl, cb) {
        var pathname = assetConfig.url.replace(/^\w+:(?:\/\/)?/, ""); // Strip protocol and two leading slashes if present
        if (/[\*\?]/.test(pathname)) {
            // Avoid triggering a GLOB_NOSPACE error when matching many files:
            var globFlags = glob.GLOB_DEFAULT & ~glob.GLOB_LIMIT;

            // Expand wildcard, then expand each resulting url
            return glob.glob(pathname, globFlags, passError(cb, function (fsPaths) {
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
            fs.readFile(pathname, null, cb);
        };
        assetConfig.isResolved = true;
        process.nextTick(function () {
            cb(null, assetConfig);
        });
    };
};
