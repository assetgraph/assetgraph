var request = require('request'),
    _ = require('lodash'),
    httpErrors = require('httperrors');

module.exports = function () {
    return function http(assetConfig, fromUrl, cb) {
        var url = assetConfig.url;
        assetConfig.rawSrcProxy = function (cb) {
            var matchUrl = url.match(/^([^#]*)((?:#.*)?)$/),
                urlWithoutFragmentIdentifier = matchUrl[1],
                fragmentIdentifier = matchUrl[2],
                requestOptions = http.requestOptions || {},
                numRetries = requestOptions.numRetries || 0,
                retryDelayMilliseconds = requestOptions.retryDelayMilliseconds || 250;

            (function doRequest() {
                // Hack: Allows you to control the request options by setting the 'requestOptions' of the returned function to
                // an object.
                var req = request(_.defaults({
                    uri: urlWithoutFragmentIdentifier,
                    onResponse: true
                }, requestOptions), function (err, response) {
                    if (err || (response && response.statusCode >= 500 && response.statusCode < 600)) {
                        if (typeof numRetries === 'number' && numRetries > 0) {
                            numRetries -= 1;
                            return setTimeout(doRequest, retryDelayMilliseconds);
                        } else if (err) {
                            return cb(err);
                        }
                    }
                    if (response.statusCode >= 400) {
                        var ErrorConstructor = httpErrors[response.statusCode] || httpErrors.BadGateway;
                        return cb(new ErrorConstructor({
                            message: 'Got ' + response.statusCode + ' error retrieving ' + urlWithoutFragmentIdentifier,
                            url: urlWithoutFragmentIdentifier
                        }));
                    }
                    var metadata = {
                            url: req.uri.href + fragmentIdentifier // Might be different from the originally requested url if redirects were followed
                        },
                        buffers = [],
                        contentType = response.headers['content-type'];
                    if (contentType) {
                        var matchContentType = contentType.match(/^\s*([\w\-\+\.]+\/[\w\-\+\.]+)(?:\s|;|$)/i);
                        if (matchContentType) {
                            metadata.contentType = matchContentType[1].toLowerCase();
                            var matchCharset = contentType.match(/;\s*charset\s*=\s*(['"]|)\s*([\w\-]+)\s*\1(?:\s|;|$)/i);
                            if (matchCharset) {
                                metadata.encoding = matchCharset[2].toLowerCase();
                            }
                        } else {
                            console.warn('resolvers.http: Couldn\'t parse Content-Type ' + response.headers['content-type'] + ' while fetching ' + url);
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
                });
            }());
        };
        assetConfig.isResolved = true;
        setImmediate(function () {
            cb(null, assetConfig);
        });
    };
};
