var fs = require('fs'),
    constants = process.ENOENT ? process : require('constants'),
    _ = require('underscore'),
    urlTools = require('../util/urlTools');

module.exports = function (fileUrl) {
    fileUrl = urlTools.ensureTrailingSlash(fileUrl);
    return function extJS4Dir(assetConfig, fromUrl, cb) {
        var labelRelativePath = assetConfig.url.replace(/^[^:]*:/, ''),
            candidatePrefixes = ['', 'core/src/', 'core/src/lang/', 'core/src/util/', 'core/src/dom/', 'src/dom/'];

        if (labelRelativePath === 'core/DomHelper.js') {
            labelRelativePath = 'DomHelper.js';
        }
        (function proceed() {
            if (candidatePrefixes.length) {
                var candidatePath = candidatePrefixes.shift() + labelRelativePath;
                fs.stat(urlTools.fileUrlToFsPath(fileUrl + candidatePath), function (err, stats) {
                    if (err) {
                        if (err.code === 'ENOENT' || err.errno === constants.ENOENT) {
                            proceed();
                        } else {
                            cb(err);
                        }
                    } else {
                        cb(null, {
                            url: fileUrl + candidatePath
                        });
                    }
                });
            } else {
                console.warn("resolvers.extJS4Dir: Skipping " + labelRelativePath + " (not found)");
                cb(null, []);
            }
        })();
    };
};
