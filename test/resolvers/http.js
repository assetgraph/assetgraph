/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    sinon = require('sinon'),
    http = require('http');

describe('resolvers/http', function () {
    it('should resolve an http url and load an asset', function (done) {
        var server = http.createServer(function (req, res) {
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=UTF-8'
                });
                res.end('Foo');
            }).listen(0),
            serverAddress = server.address(),
            serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address,
            rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/';

        new AssetGraph({root: rootUrl})
            .queue(function (assetGraph) {
                expect(assetGraph.root, 'to equal', rootUrl);
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'Foo'});
                server.close();
            })
            .run(done);
    });

    it('should emit a warn event if the remote closes the connection while attempting to retrieve an asset', function (done) {
        var requestHandler = sinon.spy(function (req, res) {
                res.destroy();
            }),
            server = http.createServer(requestHandler).listen(0),
            serverAddress = server.address(),
            serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address,
            rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/',
            warnings = [];

        new AssetGraph({root: rootUrl})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .queue(function (assetGraph) {
                assetGraph.resolverByProtocol.http.requestOptions = { numRetries: 0 };
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                server.close();
                expect(warnings, 'to have length', 1);
                expect(warnings[0].message, 'to equal', 'socket hang up');
                expect(requestHandler, 'was called once');
                expect(assetGraph, 'to contain no assets');
            })
            .run(done);
    });

    it('should retry failed requests up to the configured number of times while attempting to retrieve an asset, and then give up', function (done) {
        var requestHandler = sinon.spy(function (req, res) {
                res.destroy();
            }),
            server = http.createServer(requestHandler).listen(0),
            serverAddress = server.address(),
            serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address,
            rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/',
            warnings = [];

        new AssetGraph({root: rootUrl})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .queue(function (assetGraph) {
                assetGraph.resolverByProtocol.http.requestOptions = {numRetries: 2};
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no assets');
                server.close();
                expect(warnings, 'to have length', 1);
                expect(warnings[0].message, 'to equal', 'socket hang up');
                expect(requestHandler, 'was called thrice');
            })
            .run(done);
    });

    it('should retry timed out requests up to the configured number of times while attempting to retrieve an asset, and then give up', function (done) {
        var requestHandler = sinon.spy(function (req, res) {
                setTimeout(function () {
                    res.writeHead(200, {
                        'Content-Type': 'text/html; charset=UTF-8'
                    });
                    res.end('Foo');
                }, 1000);
            }),
            server = http.createServer(requestHandler).listen(0),
            serverAddress = server.address(),
            serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address,
            rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/',
            warnings = [];

        new AssetGraph({root: rootUrl})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .queue(function (assetGraph) {
                assetGraph.resolverByProtocol.http.requestOptions = {numRetries: 2, timeout: 10};
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                server.close();
                expect(assetGraph, 'to contain no assets');
                expect(requestHandler, 'was called thrice');
                expect(warnings, 'to have length', 1);
                expect(warnings[0].name, 'to match', /^E(?:SOCKET)?TIMEDOUT$/);
            })
            .run(done);
    });

    it('should successfully load the asset when a failed request succeeds after retrying', function (done) {
        var requestHandler = sinon.spy(function (req, res) {
                if (requestHandler.callCount > 1) {
                    res.writeHead(200, {
                        'Content-Type': 'text/html; charset=UTF-8'
                    });
                    res.end('Foo');
                } else {
                    res.destroy();
                }
            }),
            server = http.createServer(requestHandler).listen(0),
            serverAddress = server.address(),
            serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address,
            rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/',
            warnings = [];

        new AssetGraph({root: rootUrl})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .queue(function (assetGraph) {
                assetGraph.resolverByProtocol.http.requestOptions = {numRetries: 2};
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                server.close();
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'Foo'});
                expect(requestHandler, 'was called twice');
                expect(warnings, 'to equal', []);
            })
            .run(done);
    });

    it('should successfully load the asset when a timed out request succeeds after retrying', function (done) {
        var requestHandler = sinon.spy(function (req, res) {
                if (requestHandler.callCount > 1) {
                    res.writeHead(200, {
                        'Content-Type': 'text/html; charset=UTF-8'
                    });
                    res.end('Foo');
                }
            }),
            server = http.createServer(requestHandler).listen(0),
            serverAddress = server.address(),
            serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address,
            rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/',
            warnings = [];

        new AssetGraph({root: rootUrl})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .queue(function (assetGraph) {
                assetGraph.resolverByProtocol.http.requestOptions = {numRetries: 2, timeout: 50};
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                server.close();
                expect(requestHandler, 'was called twice');
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'Foo'});
                expect(warnings, 'to equal', []);
            })
            .run(done);
    });

    it('should successfully load the asset when a request that got a 500 succeeded after retrying', function (done) {
        var requestHandler = sinon.spy(function (req, res) {
                res.writeHead(requestHandler.callCount > 1 ? 200 : 500, {
                    'Content-Type': 'text/plain; charset=UTF-8'
                });
                res.end('Foo');
            }),
            server = http.createServer(requestHandler).listen(0),
            serverAddress = server.address(),
            serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address,
            rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/',
            warnings = [];

        new AssetGraph({root: rootUrl})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .queue(function (assetGraph) {
                assetGraph.resolverByProtocol.http.requestOptions = {numRetries: 2, timeout: 50};
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                server.close();
                expect(requestHandler, 'was called twice');
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'Foo'});
                expect(warnings, 'to equal', []);
            })
            .run(done);
    });

    it('should not retry when getting a 4xx response', function (done) {
        var requestHandler = sinon.spy(function (req, res) {
                res.writeHead(404, {
                    'Content-Type': 'text/plain; charset=UTF-8'
                });
                res.end('Foo');
            }),
            server = http.createServer(requestHandler).listen(0),
            serverAddress = server.address(),
            serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address,
            rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/',
            warnings = [];

        new AssetGraph({root: rootUrl})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .queue(function (assetGraph) {
                assetGraph.resolverByProtocol.http.requestOptions = {numRetries: 2, timeout: 50};
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                server.close();
                expect(requestHandler, 'was called once');
                expect(assetGraph, 'to contain no assets', {type: 'Html', text: 'Foo'});
                expect(warnings, 'to have length', 1);
                expect(warnings[0].NotFound, 'to be true');
            })
            .run(done);
    });

    it('should successfully load the asset when a timed out request that had the headers sent succeeds after retrying', function (done) {
        var requestHandler = sinon.spy(function (req, res) {
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=UTF-8'
                });
                if (requestHandler.callCount > 1) {
                    res.end('Foo');
                }
            }),
            server = http.createServer(requestHandler).listen(0),
            serverAddress = server.address(),
            serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address,
            rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/',
            warnings = [];

        new AssetGraph({root: rootUrl})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .queue(function (assetGraph) {
                assetGraph.resolverByProtocol.http.requestOptions = {numRetries: 2, timeout: 1000};
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                server.close();
                expect(requestHandler, 'was called twice');
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'Foo'});
                expect(warnings, 'to equal', []);
            })
            .run(done);
    });

    it('should successfully load the asset when a timed out request that had the headers and part of the response body sent succeeds after retrying', function (done) {
        var requestHandler = sinon.spy(function (req, res) {
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=UTF-8'
                });
                res.write('Foo');
                if (requestHandler.callCount > 1) {
                    res.end('Bar');
                }
            }),
            server = http.createServer(requestHandler).listen(0),
            serverAddress = server.address(),
            serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address,
            rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/',
            warnings = [];

        new AssetGraph({root: rootUrl})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .queue(function (assetGraph) {
                assetGraph.resolverByProtocol.http.requestOptions = {numRetries: 2, timeout: 20};
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                server.close();
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'FooBar'});
                expect(requestHandler, 'was called twice');
                expect(warnings, 'to equal', []);
            })
            .run(done);
    });

    it('should retry once encountering a self-redirect', function () {
        return expect(function (cb) {
            new AssetGraph({ root: 'http://example.com/' })
                .queue(function (assetGraph) {
                    assetGraph.resolverByProtocol.http.requestOptions = { numRetries: 1 };
                })
                .loadAssets('/')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'Html');
                })
                .run(cb);
        }, 'with http mocked out', [
            { request: 'GET http://example.com/', response: { statusCode: 301, headers: { Location: 'http://example.com/' } } },
            {
                request: 'GET http://example.com/',
                response: {
                    headers: 'Content-Type: text/html; charset=UTF-8',
                    body: '<!DOCTYPE html><html><head></head><body>Hey!</body></html>'
                }
            }
        ], 'to call the callback without error');
    });

    it('should disregard the fragment identifier of both the asset being loaded and the Location header when deciding whether it is a self-redirect', function () {
        return expect(function (cb) {
            new AssetGraph({ root: 'http://example.com/' })
                .queue(function (assetGraph) {
                    assetGraph.resolverByProtocol.http.requestOptions = { numRetries: 1 };
                })
                .loadAssets('/#foo')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'Html');
                })
                .run(cb);
        }, 'with http mocked out', [
            { request: 'GET http://example.com/', response: { statusCode: 301, headers: { Location: 'http://example.com/#bar' } } },
            {
                request: 'GET http://example.com/',
                response: {
                    headers: 'Content-Type: text/html; charset=UTF-8',
                    body: '<!DOCTYPE html><html><head></head><body>Hey!</body></html>'
                }
            }
        ], 'to call the callback without error');
    });

    it('should not provide metadata.contentType when the Content-Type header cannot be parsed, thus falling back to parsing the extension', function () {
        var html = '<!DOCTYPE html>\n<html><head></head><body><p>Hello, world</p></body></html>';
        return expect(function (cb) {
            new AssetGraph({ root: 'http://example.com/' })
                .loadAssets('/foo.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', { type: 'Html', text: html });
                })
                .run(cb);
        }, 'with http mocked out', [
            {
                request: 'GET http://example.com/foo.html',
                response: {
                    statusCode: 200,
                    headers: 'Content-Type: &',
                    body: new Buffer(html)
                }
            }
        ], 'to call the callback without error');
    });
});
