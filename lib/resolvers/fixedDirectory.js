var _ = require('underscore');

module.exports = function (fsPath) {
    return function fixedDirectory(assetConfig, fromUrl, cb) {
        var labelRelativePath = assetConfig.url.replace(/^[^:]*:/, '');
        process.nextTick(function () {
            cb(null, {
                url: fsPath + labelRelativePath
            });
        });
    };
};
