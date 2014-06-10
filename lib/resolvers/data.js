var _ = require('lodash'),
    errors = require('../errors'),
    resolveDataUrl = require('../util/resolveDataUrl');

module.exports = function () {
    return function data(assetConfig, fromUrl, cb) {
        var resolvedDataUrl = resolveDataUrl(assetConfig.url);
        if (resolvedDataUrl) {
            delete assetConfig.url;
            _.extend(assetConfig, resolvedDataUrl);
            assetConfig.isResolved = true;
            setImmediate(function () {
                cb(null, assetConfig);
            });
        } else {
            setImmediate(function () {
                cb(new errors.ParseError({
                    message: 'Cannot parse data url: ' + assetConfig.url,
                    asset: assetConfig
                }));
            });
        }
    };
};
