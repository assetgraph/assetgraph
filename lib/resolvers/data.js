module.exports = function () {
    return function data(assetConfig, fromUrl, cb) {
        var dataUrlMatch = assetConfig.url.match(/^data:([\w\-]+\/[\w\-]+)?(?:;charset=([\w\/\-]+))?(;base64)?,([\u0000-\u007f]*)$/);
        if (dataUrlMatch) {
            delete assetConfig.url;
            var contentType = dataUrlMatch[1] || 'text/plain',
                body = dataUrlMatch[4];
            if (dataUrlMatch[2]) {
                assetConfig.encoding = dataUrlMatch[2];
            } else {
                assetConfig.encoding = 'us-ascii';
            }
            if (dataUrlMatch[3]) {
                assetConfig.rawSrc = new Buffer(body, 'base64');
            } else {
                var octets = [];
                for (var i = 0 ; i < body.length ; i += 1) {
                    if (body[i] === '%' && /^[a-f0-9]$/i.test(body[i + 1]) && /^[a-f0-9]$/i.test(body[i + 2])) {
                        octets.push(parseInt(body.substr(i + 1, 2), 16));
                        i += 2;
                    } else {
                        octets.push(body.charCodeAt(i));
                    }
                }
                assetConfig.rawSrc = new Buffer(octets);
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
