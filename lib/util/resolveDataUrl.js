module.exports = function resolveDataUrl(dataUrl) {
    var matchDataUrl = dataUrl.match(/^data:([\w\-\+\.]+\/[\w\-\+\.]+)?(?:;charset=([\w\/\-]+))?(;base64)?,([\u0000-\u007f]*)$/);
    if (matchDataUrl) {
        var assetConfig = {};
        var contentType = matchDataUrl[1] || 'text/plain';
        var body = matchDataUrl[4];
        if (matchDataUrl[2]) {
            assetConfig.encoding = matchDataUrl[2];
        } else {
            assetConfig.encoding = 'us-ascii';
        }
        if (matchDataUrl[3]) {
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
        return assetConfig;
    } else {
        return null;
    }
};
