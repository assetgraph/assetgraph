var Repl = require('repl');
var Promise = require('bluebird');
var open = require('open');

function quoteRegExpMetaChars(str) {
    return str.replace(/[\\\|\.\+\*\{\}\[\]\(\)\?\^\$]/g, '\\$&');
}

function htmlEncode(str) {
    return str.replace(/</g, '&lt;');
}

module.exports = function (options) {
    if (typeof options === 'string') {
        options = {prompt: options};
    } else {
        options = options || {};
    }
    return function startRepl(assetGraph) {
        var repl = Repl.start({prompt: options.prompt || 'assetGraph> '});
        repl.context.assetGraph = assetGraph;
        var server;
        if (options.server) {
            server = require('http').createServer(function (req, res) {
                var foundAsset;
                if (/\/$/.test(req.url)) {
                    var prefixUrl = assetGraph.root + req.url.substr(1);
                    foundAsset = assetGraph.findAssets({url: prefixUrl + 'index.html'})[0];
                    if (!foundAsset) {
                        var title = 'Index of ' + prefixUrl;
                        res.setHeader('Content-Type', 'text/html; charset=utf-8');
                        res.write('<!DOCTYPE html><html><head><title>' + htmlEncode(title) + '</title></head><body><h1>' + htmlEncode(title) + '</h1>');
                        var assetsInDirectory = assetGraph.findAssets({url: new RegExp('^' + quoteRegExpMetaChars(prefixUrl))});
                        if (assetsInDirectory.length > 0) {
                            var isSubdirectoryByHref = {};
                            var immediateChildren = [];
                            assetsInDirectory.forEach(function (asset) {
                                var relativeUrl = asset.url.replace(prefixUrl, '');
                                var indexOfSlash = relativeUrl.indexOf('/');
                                if (indexOfSlash === -1) {
                                    immediateChildren.push(asset);
                                } else {
                                    isSubdirectoryByHref[relativeUrl.substr(0, indexOfSlash)] = true;
                                }
                            });
                            res.write('<ul>');
                            Object.keys(isSubdirectoryByHref).forEach(function (subdirectoryHref) {
                                res.write('<li><a href="' + htmlEncode(subdirectoryHref) + '/">' + htmlEncode(decodeURIComponent(subdirectoryHref)) + '</a></li>');
                            });
                            immediateChildren.forEach(function (asset) {
                                res.write('<li><a href="' + htmlEncode(asset.url.replace(prefixUrl, '')) + '">' + htmlEncode(decodeURIComponent(asset.url.replace(prefixUrl, ''))) + '</a></li>');
                            });
                            res.write('</ul>');
                        } else {
                            res.write('<h2>No entries found</h1>');
                        }
                        return res.end('</body></html>');
                    }
                }
                foundAsset = foundAsset || assetGraph.findAssets({isLoaded: true, url: assetGraph.root + req.url.substr(1)})[0];
                if (foundAsset) {
                    var etag = '"' + foundAsset.md5Hex + '"';
                    res.setHeader('ETag', etag);
                    res.setHeader('Content-Type', foundAsset.contentType);
                    var rawSrc = foundAsset.rawSrc;
                    res.setHeader('Content-Length', String(foundAsset.rawSrc.length));
                    if (req.headers['if-none-match'] && req.headers['if-none-match'].indexOf(etag) !== -1) {
                        res.writeHead(304);
                        res.end();
                    } else {
                        res.end(rawSrc);
                    }
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            server.listen(0, function () {
                var url = 'http://localhost:' + server.address().port + '/';
                var initialAssetsAtRoot = assetGraph.findAssets({ isInitial: true, isInline: false }).filter(function (initialAsset) {
                    return initialAsset.url.indexOf(assetGraph.root) === 0 && initialAsset.url.indexOf('/', assetGraph.root.length + 1) === -1;
                });
                if (initialAssetsAtRoot.length === 1) {
                    url += initialAssetsAtRoot[0].url.replace(assetGraph.root, '');
                }
                open(url);
            });
        }

        return new Promise(function (resolve, reject) {
            repl.on('error', function (err) {
                assetGraph.emit('warn', err);
            }).on('exit', resolve);
        }).finally(function () {
            if (server) {
                server.close();
            }
        });
    };
};
