/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph'),
    http = require('http');

describe('relations/HttpRedirect', function () {
    it('should handle a basic test case', function (done) {
        var serverAddress,
            rootUrl,
            loopCount = 0,
            infiniteloopCount = 0,
            server = http.createServer(function (req, res) {
                if (req.url === '/301') {
                    res.writeHead(301, {
                        Location: '/relativeRedirectTarget.html',
                        'Content-Type': 'text/html; charset=UTF-8'
                    });
                    res.end('<!DOCTYPE html><html><head></head><html>Moved permanently</body></html>');
                } else if (req.url === '/302') {
                    res.writeHead(302, {
                        Location: rootUrl + 'absoluteRedirectTarget.html',
                        'Content-Type': 'text/html; charset=UTF-8'
                    });
                    res.end('<!DOCTYPE html><html><head></head><html>Moved temporarily</body></html>');
                } else if (req.url === '/infiniteloop') {
                    infiniteloopCount += 1;
                    res.writeHead(302, {
                        Location: rootUrl + 'infiniteloop',
                        'Content-Type': 'text/html; charset=UTF-8'
                    });
                    res.end('<!DOCTYPE html><html><head></head><html>Moved temporarily</body></html>');
                } else if (req.url === '/loop') {
                    if (loopCount === 0) {
                        loopCount += 1;
                        res.writeHead(302, {
                            Location: rootUrl + 'loop',
                            'Content-Type': 'text/html; charset=UTF-8'
                        });
                        res.end('<!DOCTYPE html><html><head></head><html>Moved temporarily</body></html>');
                    } else {
                        res.writeHead(301, {
                            Location: '/loopRedirectTarget.html',
                            'Content-Type': 'text/html; charset=UTF-8'
                        });
                        res.end('<!DOCTYPE html><html><head></head><html>Moved permanently</body></html>');
                    }
                } else if (/\/(?:relative|absolute|loop)RedirectTarget\.html$/.test(req.url)) {
                    res.writeHead(200, {
                        'Content-Type': 'text/html; charset=UTF-8'
                    });
                    res.end('This is ' + req.url);
                } else {
                    res.writeHead(404);
                    res.end();
                }
            }).listen(0);

        serverAddress = server.address();
        var serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address;
        rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/';

        var assetGraph = new AssetGraph({root: rootUrl});

        assetGraph
            .queue(function (assetGraph) {
                assetGraph.requestOptions = { numRetries: 1 };
            })
            .loadAssets('/301', '/302', '/loop', '/infiniteloop')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 7);
                expect(assetGraph, 'to contain assets', {isRedirect: true}, 4);
                expect(assetGraph, 'to contain relations', 'HttpRedirect', 4);
                expect(loopCount, 'to be', 1);
                expect(infiniteloopCount, 'to be', 2);
                server.close();
            })
            .run(done);
    });
});
