/*global setImmediate:true*/
// node 0.8 compat
if (typeof setImmediate === 'undefined') {
    setImmediate = process.nextTick;
}

module.exports = function () {
    return function javascript(assetConfig, fromUrl, cb) {
        assetConfig.text = assetConfig.url.replace(/^javascript:/i, '');
        assetConfig.type = 'JavaScript';
        assetConfig.isResolved = true;
        delete assetConfig.url;
        setImmediate(function () {
            cb(null, assetConfig);
        });
    };
};
