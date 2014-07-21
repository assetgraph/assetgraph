/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    http = require('http');

describe('relations/HtmlMetaRefresn', function () {
    it('should handle a basic test case', function (done) {
        var serverAddress,
            rootUrl,
            server = http.createServer(function (req, res) {
                if (req.url === '/metaRefresh') {
                    res.writeHead(302, {
                        'Content-Type': 'text/html; charset=UTF-8'
                    });
                    res.end('<!DOCTYPE html><html><head><meta http-equiv="refresh" content="5; url=/metaRefreshTarget.html"></head><html>Moved temporarily</body></html>');
                } else if (/\/.*Target\.html$/.test(req.url)) {
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
            .loadAssets('/metaRefresh')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain relations', 'HtmlMetaRefresh', 1);
                server.close();
            })
            .run(done);
    });
});
