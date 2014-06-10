var urlTools = require('urltools');

module.exports = function (fileUrl) {
    fileUrl = urlTools.ensureTrailingSlash(fileUrl);
    return function fixedDirectory(assetConfig, fromUrl, cb) {
        var labelRelativePath = assetConfig.url.replace(/^[^:]*:/, '');
        setImmediate(function () {
            cb(null, {
                url: fileUrl + labelRelativePath
            });
        });
    };
};
