var request = require('request'),
    passError = require('../util/passError');

require('bufferjs');

module.exports = function () {
    return function http(assetConfig, fromUrl, cb) {
        var url = assetConfig.url;
        assetConfig.rawSrcProxy = function (cb) {
            var matchUrl = url.match(/^([^#]*)((?:#.*)?)$/),
                urlWithoutFragmentIdentifier = matchUrl[1],
                fragmentIdentifier = matchUrl[2],
                req;
            req = request({
                uri: urlWithoutFragmentIdentifier,
                onResponse: true
            }, passError(cb, function (response) {
                if (response.statusCode >= 400) {
                    cb(new Error("Got " + response.statusCode + " from remote server: " + url));
                } else {
                    var metadata = {
                            url: req.uri.href + fragmentIdentifier // Might be different from the originally requested url if redirects were followed
                        },
                        buffers = [];
                    if ('content-type' in response.headers) {
                        var matchContentType = response.headers['content-type'].match(/^\s*([\w\/\-]+)\s*(?:;\s*charset=([\'\"]|)\s*([\w\-]+)\s*\2\s*)?$/i);
                        if (matchContentType) {
                            metadata.contentType = matchContentType[1].toLowerCase();
                            if (matchContentType[3]) {
                                metadata.encoding = matchContentType[3].toLowerCase();
                            }
                        } else {
                            console.warn("resolvers.http: Couldn't parse Content-Type " + response.headers['content-type'] + " while fetching " + url);
                        }
                    }
                    if ('etag' in response.headers) {
                        metadata.etag = response.headers.etag;
                    }
                    if ('cache-control' in response.headers) {
                        metadata.cacheControl = response.headers['cache-control'];
                    }
                    ['date', 'last-modified'].forEach(function (headerName) {
                        if (headerName in response.headers) {
                            metadata[headerName.replace(/-([a-z])/, function ($0, ch) {
                                return ch.toUpperCase();
                            })] = new Date(response.headers[headerName]);
                        }
                    });
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
