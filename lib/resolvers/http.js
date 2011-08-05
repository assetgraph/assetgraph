var request = require('request'),
    passError = require('../util/passError');

require('bufferjs');

module.exports = function () {
    return function http(assetConfig, fromUrl, cb) {
        assetConfig.rawSrcProxy = function (cb) {
            request({
                url: assetConfig.url.replace(/#.*$/, ''), // Don't send fragment identifier to the server
                onResponse: true
            }, passError(cb, function (response) {
                if (response.statusCode >= 400) {
                    cb(new Error("Got " + response.statusCode + " from remote server: " + assetConfig.url));
                } else {
                    var metadata = {},
                        buffers = [];
                    if ('content-type' in response.headers) {
                        var matchContentType = response.headers['content-type'].match(/^\s*([\w\/\-]+)\s*(?:;\s*charset=([\'\"]|)\s*([\w\-]+)\s*\2\s*)?$/i);
                        if (matchContentType) {
                            metadata.contentType = matchContentType[1].toLowerCase();
                            if (matchContentType[3]) {
                                metadata.encoding = matchContentType[3].toLowerCase();
                            }
                        } else {
                            console.warn("resolvers.http: Couldn't parse Content-Type " + response.headers['content-type'] + " while fetching " + assetConfig.url);
                        }
                    }
                    response.on('data', function (buffer) {
                        buffers.push(buffer);
                    }).on('end', function () {
                        cb(null, Buffer.concat(buffers), metadata);
                    }).on('error', cb);
                }
            }));
        };
        assetConfig.isResolved = true;
        process.nextTick(function () {
            cb(null, assetConfig);
        });
    };
};
