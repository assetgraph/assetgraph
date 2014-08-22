var request = require('request'),
    _ = require('lodash'),
    httpErrors = require('httperrors'),
    URL = require('url');

module.exports = function () {
    return function http(assetConfig, fromUrl, cb) {
        var url = assetConfig.url;
        assetConfig.rawSrcProxy = function (_cb) {
            var matchUrl = url.match(/^([^#]*)/),
                urlWithoutFragmentIdentifier = matchUrl[1],
                requestOptions = http.requestOptions || {},
                numRetries = requestOptions.numRetries || 0,
                retryDelayMilliseconds = requestOptions.retryDelayMilliseconds || 250,
                numSelfRedirectRetries = requestOptions.numSelfRedirectRetries || 1,
                callbackCalled = false;

            function cb() {
                if (!callbackCalled) {
                    callbackCalled = true;
                    return _cb.apply(this, arguments);
                }
            }

            function doRequest() {
                var seenError = false;
                function handleError(err, response) {
                    if (seenError) {
                        return;
                    }
                    if (err || (response && response.statusCode >= 500 && response.statusCode < 600)) {
                        if (typeof numRetries === 'number' && numRetries > 0) {
                            numRetries -= 1;
                            seenError = true;
                            setTimeout(doRequest, retryDelayMilliseconds);
                            return true;
                        } else if (err) {
                            seenError = true;
                            cb(err);
                            return true;
                        }
                    } else if (response && response.statusCode >= 301 && response.statusCode <= 303 &&
                               'location' in response.headers &&
                               URL.resolve(urlWithoutFragmentIdentifier, response.headers.location).replace(/#.*$/, '') === urlWithoutFragmentIdentifier) {
                        if (numSelfRedirectRetries > 0) {
                            numSelfRedirectRetries -= 1;
                            seenError = true;
                            setTimeout(doRequest, retryDelayMilliseconds);
                            return true;
                        } else {
                            // Would've emitted new Error('Infinite redirect loop detected.'), but the AssetGraph
                            // instance is not in scope here
                            return;
                        }
                    }
                    if (response && response.statusCode >= 400) {
                        seenError = true;
                        var ErrorConstructor = httpErrors[response.statusCode] || httpErrors.BadGateway;
                        return cb(new ErrorConstructor({
                            message: 'Got ' + response.statusCode + ' error retrieving ' + urlWithoutFragmentIdentifier,
                            url: urlWithoutFragmentIdentifier
                        }));
                    }
                }
                // Hack: Allows you to control the request options by setting the 'requestOptions' of the returned function to
                // an object.
                var req = request(_.defaults({
                    uri: urlWithoutFragmentIdentifier,
                    followRedirect: false,
                    onResponse: true
                }, requestOptions), function (err, response) {
                    if (seenError || handleError(err, response)) {
                        return;
                    }
                    var metadata = {
                            statusCode: response.statusCode
                        },
                        buffers = [],
                        contentType = response.headers['content-type'];

                    if (typeof response.headers.location !== 'undefined') {
                        metadata.location = response.headers.location;
                    }
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
                        if (!seenError) {
                            cb(null, Buffer.concat(buffers), metadata);
                        }
                    }).on('error', handleError);
                });
                req.on('error', handleError);
            }

            doRequest();
        };
        assetConfig.isResolved = true;
        setImmediate(function () {
            cb(null, assetConfig);
        });
    };
};
