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
            rootUrl = 'http://' + serverAddress.address + ':' + serverAddress.port + '/';

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
            rootUrl = 'http://' + serverAddress.address + ':' + serverAddress.port + '/',
            warnings = [];

        new AssetGraph({root: rootUrl})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                expect(warnings, 'to have length', 1);
                expect(warnings[0].message, 'to equal', 'socket hang up');
                expect(requestHandler, 'was called once');
                expect(assetGraph, 'to contain no assets');
                server.close();
            })
            .run(done);
    });

    it('should retry failed requests up to the configured number of times while attempting to retrieve an asset, and then give up', function (done) {
        var requestHandler = sinon.spy(function (req, res) {
                res.destroy();
            }),
            server = http.createServer(requestHandler).listen(0),
            serverAddress = server.address(),
            rootUrl = 'http://' + serverAddress.address + ':' + serverAddress.port + '/',
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
                expect(warnings, 'to have length', 1);
                expect(warnings[0].message, 'to equal', 'socket hang up');
                expect(requestHandler, 'was called thrice');
                expect(assetGraph, 'to contain no assets');
                server.close();
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
                }, 200);
            }),
            server = http.createServer(requestHandler).listen(0),
            serverAddress = server.address(),
            rootUrl = 'http://' + serverAddress.address + ':' + serverAddress.port + '/',
            warnings = [];

        new AssetGraph({root: rootUrl})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .queue(function (assetGraph) {
                assetGraph.resolverByProtocol.http.requestOptions = {numRetries: 2, timeout: 100};
            })
            .loadAssets('/foo.html')
            .populate()
            .queue(function (assetGraph) {
                expect(warnings, 'to have length', 1);
                expect(warnings[0].message, 'to match', /^E(?:SOCKET)?TIMEDOUT$/);
                expect(requestHandler, 'was called thrice');
                expect(assetGraph, 'to contain no assets');
                server.close();
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
            rootUrl = 'http://' + serverAddress.address + ':' + serverAddress.port + '/',
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
                expect(warnings, 'to equal', []);
                expect(requestHandler, 'was called twice');
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'Foo'});
                server.close();
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
            rootUrl = 'http://' + serverAddress.address + ':' + serverAddress.port + '/',
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
                expect(warnings, 'to equal', []);
                expect(requestHandler, 'was called twice');
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'Foo'});
                server.close();
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
            rootUrl = 'http://' + serverAddress.address + ':' + serverAddress.port + '/',
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
                expect(warnings, 'to equal', []);
                expect(requestHandler, 'was called twice');
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'Foo'});
                server.close();
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
            rootUrl = 'http://' + serverAddress.address + ':' + serverAddress.port + '/',
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
                expect(warnings, 'to have length', 1);
                expect(warnings[0].NotFound, 'to be true');
                expect(requestHandler, 'was called once');
                expect(assetGraph, 'to contain no assets', {type: 'Html', text: 'Foo'});
                server.close();
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
            rootUrl = 'http://' + serverAddress.address + ':' + serverAddress.port + '/',
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
                expect(warnings, 'to equal', []);
                expect(requestHandler, 'was called twice');
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'Foo'});
                server.close();
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
            rootUrl = 'http://' + serverAddress.address + ':' + serverAddress.port + '/',
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
                expect(requestHandler, 'was called twice');
                expect(warnings, 'to equal', []);
                expect(assetGraph, 'to contain asset', {type: 'Html', text: 'FooBar'});
                server.close();
            })
            .run(done);
    });
});
