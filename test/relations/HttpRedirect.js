/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    http = require('http');

describe('relations/HttpRedirect', function () {
    it('should handle a basic test case', function (done) {
        var serverAddress,
            rootUrl,
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
                } else if (/\/(?:relative|absolute)RedirectTarget\.html$/.test(req.url)) {
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

        new AssetGraph({root: rootUrl})
            .loadAssets('/301', '/302')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 4);
                expect(assetGraph, 'to contain relations', 'HttpRedirect', 2);
                server.close();
            })
            .run(done);
    });
});
