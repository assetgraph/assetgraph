module.exports = function () {
    return function javascript(assetConfig, fromUrl, cb) {
        assetConfig.text = assetConfig.url.replace(/^javascript:/i, '');
        assetConfig.type = 'JavaScript';
        assetConfig.isResolved = true;
        delete assetConfig.url;
        process.nextTick(function () {
            cb(null, assetConfig);
        });
    };
};
