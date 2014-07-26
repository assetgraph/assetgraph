/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
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
        rootUrl = 'http://' + serverAddress.address + ':' + serverAddress.port + '/';

        var assetGraph = new AssetGraph({root: rootUrl});

        assetGraph
            .on('warn', function (warning) {
                if (!Array.isArray(assetGraph._warnings)) {
                    assetGraph._warnings = [];
                }
                assetGraph._warnings.push(warning);
            })
            .loadAssets('/301', '/302', '/loop', '/infiniteloop')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 9);
                expect(assetGraph, 'to contain assets', {isRedirect: true}, 6);
                expect(assetGraph, 'to contain relations', 'HttpRedirect', 6);
                expect(loopCount, 'to be', 1);
                expect(infiniteloopCount, 'to be', 2);
                expect(assetGraph._warnings, 'to be a non-empty array');
                expect(assetGraph._warnings, 'to be an array whose items satisfy', function (item) {
                    expect(item, 'to be an', Error);
                    expect(item.message, 'to be', 'Infinite redirect loop detected.');
                });
                server.close();
            })
            .run(done);
    });
});
