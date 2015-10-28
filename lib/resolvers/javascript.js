module.exports = function () {
    return function javascript(assetConfig, fromUrl, cb) {
        assetConfig.text = assetConfig.url.replace(/^javascript:/i, '');
        assetConfig.type = 'JavaScript';
        assetConfig.isResolved = true;
        assetConfig.url = undefined;
        setImmediate(function () {
            cb(null, assetConfig);
        });
    };
};
