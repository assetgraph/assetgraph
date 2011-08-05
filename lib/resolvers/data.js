module.exports = function () {
    return function data(assetConfig, fromUrl, cb) {
        var dataUrlMatch = assetConfig.url.match(/^data:([\w\/\-]+)(?:;charset=([\w\/\-]+))?(;base64)?,(.*)$/);
        if (dataUrlMatch) {
            var contentType = dataUrlMatch[1];
            if (dataUrlMatch[2]) {
                assetConfig.encoding = dataUrlMatch[2];
            }
            if (dataUrlMatch[3]) {
                assetConfig.rawSrc = new Buffer(dataUrlMatch[4], 'base64');
            } else {
                assetConfig.rawSrc = new Buffer(dataUrlMatch[4], 'binary'); // FIXME: support percent-encoded bytes?
            }
            assetConfig.contentType = assetConfig.contentType || contentType;
            assetConfig.isResolved = true;
            process.nextTick(function () {
                cb(null, assetConfig);
            });
        } else {
            process.nextTick(function () {
                cb(new Error("Cannot parse data url: " + assetConfig.url));
            });
        }
    };
};
