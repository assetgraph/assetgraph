/*global describe, it*/
var AssetGraph = require('../lib'),
    expect = require('./unexpected-with-plugins');

describe('Assetgraph', function () {
    describe('canonicalRoot option', function () {
        it('should throw when canonicalRoot is not a string', function () {
            return expect(function () {
                return new AssetGraph({ canonicalRoot: true });
            }, 'to throw', /canonicalRoot must be a URL string/);
        });

        it('should throw when canonicalRoot is not a URL', function () {
            return expect(function () {
                return new AssetGraph({ canonicalRoot: 'foo' });
            }, 'to throw', /canonicalRoot must be a URL string/);
        });

        it('should accept a http URL', function () {
            return expect(function () {
                var ag = new AssetGraph({ canonicalRoot: 'http://fisk.dk/' });

                expect(ag.canonicalRoot, 'to be', 'http://fisk.dk/');
            }, 'not to throw');
        });

        it('should accept a http URL with a path', function () {
            return expect(function () {
                var ag = new AssetGraph({ canonicalRoot: 'http://fisk.dk/foo/bar/baz/' });

                expect(ag.canonicalRoot, 'to be', 'http://fisk.dk/foo/bar/baz/');
            }, 'not to throw');
        });

        it('should accept a http URL with a subdomain', function () {
            return expect(function () {
                var ag = new AssetGraph({ canonicalRoot: 'http://sub.fisk.dk/' });

                expect(ag.canonicalRoot, 'to be', 'http://sub.fisk.dk/');
            }, 'not to throw');
        });

        it('should accept a https URL', function () {
            return expect(function () {
                var ag = new AssetGraph({ canonicalRoot: 'https://fisk.dk/' });

                expect(ag.canonicalRoot, 'to be', 'https://fisk.dk/');
            }, 'not to throw');
        });

        it('should accept a protocol relative URL', function () {
            return expect(function () {
                var ag = new AssetGraph({ canonicalRoot: '//fisk.dk/' });

                expect(ag.canonicalRoot, 'to be', '//fisk.dk/');
            }, 'not to throw');
        });

        it('should ensure a trailing slash ', function () {
            return expect(function () {
                var ag = new AssetGraph({ canonicalRoot: '//fisk.dk' });

                expect(ag.canonicalRoot, 'to be', '//fisk.dk/');
            }, 'not to throw');
        });
    });
});
