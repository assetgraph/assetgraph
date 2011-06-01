var _ = require('underscore'),
    urlTools = require('../util/urlTools');

module.exports = function (fileUrl) {
    fileUrl = urlTools.ensureTrailingSlash(fileUrl);
    return function fixedDirectory(assetConfig, fromUrl, cb) {
        var labelRelativePath = assetConfig.url.replace(/^[^:]*:/, '');
        process.nextTick(function () {
            cb(null, {
                url: fileUrl + labelRelativePath
            });
        });
    };
};
