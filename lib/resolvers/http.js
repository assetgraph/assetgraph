var Teepee = require('teepee'),
    _ = require('lodash'),
    passError = require('passerror');

module.exports = function () {
    var teepee = new Teepee({
        retry: [ 'selfRedirect', '5xx' ],
        headers: {
            'User-Agent': 'AssetGraph v' + require('../../package.json').version + ' (https://www.npmjs.com/package/assetgraph)'
        }
    });

    function http(assetConfig, fromUrl, cb) {
        var url = assetConfig.url;
        assetConfig.rawSrcProxy = function (_cb) {
            teepee.request(_.defaults({ url: url }, http.requestOptions), passError(_cb, function (response) {
                var metadata = { statusCode: response.statusCode };
                if (response.headers.location) {
                    metadata.location = response.headers.location;
                }
                var contentType = response.headers['content-type'];
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
                if (response.headers.etag) {
                    metadata.etag = response.headers.etag;
                }
                if (response.headers['cache-control']) {
                    metadata.cacheControl = response.headers['cache-control'];
                }
                ['date', 'last-modified'].forEach(function (headerName) {
                    if (response.headers[headerName]) {
                        metadata[headerName.replace(/-([a-z])/, function ($0, ch) {
                            return ch.toUpperCase();
                        })] = new Date(response.headers[headerName]);
                    }
                });

                _cb(null, response.body, metadata);
            }));
        };
        assetConfig.isResolved = true;
        setImmediate(function () {
            cb(null, assetConfig);
        });
    }

    http.teepee = teepee;

    return http;
};
