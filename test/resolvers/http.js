/*global describe, it*/
var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib/AssetGraph');
var http = require('http');
var httpception = require('httpception');

describe('resolvers/http', function () {
    it('should resolve an http url and load an asset', function () {
        var server = http.createServer(function (req, res) {
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=UTF-8'
                });
                res.end('Foo');
            }).listen(0),
            serverAddress = server.address(),
            serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address,
            rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/';

        return new AssetGraph({root: rootUrl})
            .queue(function (assetGraph) {
                expect(assetGraph.root, 'to equal', rootUrl);
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'Foo'});
                server.close();
            });
    });

    it('should retry once encountering a self-redirect', function () {
        httpception([
            { request: 'GET http://example.com/', response: { statusCode: 301, headers: { Location: 'http://example.com/' } } },
            {
                request: 'GET http://example.com/',
                response: {
                    headers: 'Content-Type: text/html; charset=UTF-8',
                    body: '<!DOCTYPE html><html><head></head><body>Hey!</body></html>'
                }
            }
        ]);

        return new AssetGraph({ root: 'http://example.com/' })
            .queue(function (assetGraph) {
                assetGraph.requestOptions = { numRetries: 1 };
            })
            .loadAssets('/')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Html');
            });
    });

    it('should disregard the fragment identifier of both the asset being loaded and the Location header when deciding whether it is a self-redirect', function () {
        httpception([
            { request: 'GET http://example.com/', response: { statusCode: 301, headers: { Location: 'http://example.com/#bar' } } },
            {
                request: 'GET http://example.com/',
                response: {
                    headers: 'Content-Type: text/html; charset=UTF-8',
                    body: '<!DOCTYPE html><html><head></head><body>Hey!</body></html>'
                }
            }
        ]);

        return new AssetGraph({ root: 'http://example.com/' })
            .queue(function (assetGraph) {
                assetGraph.requestOptions = { numRetries: 1 };
            })
            .loadAssets('/#foo')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Html');
            });
    });

    it('should not provide metadata.contentType when the Content-Type header cannot be parsed, thus falling back to parsing the extension', function () {
        var html = '<!DOCTYPE html>\n<html><head></head><body><p>Hello, world</p></body></html>';

        httpception({
            request: 'GET http://example.com/foo.html',
            response: {
                statusCode: 200,
                headers: 'Content-Type: &',
                body: new Buffer(html)
            }
        });

        return new AssetGraph({ root: 'http://example.com/' })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', { type: 'Html', text: html });
            });
    });
});
