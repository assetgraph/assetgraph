/* global describe, it */
const AssetGraph = require('../lib/AssetGraph');
const expect = require('./unexpected-with-plugins');

describe('Assetgraph', function() {
  describe('canonicalRoot option', function() {
    it('should throw when canonicalRoot is not a string', function() {
      return expect(
        function() {
          return new AssetGraph({ canonicalRoot: true });
        },
        'to throw',
        /canonicalRoot must be a URL string/
      );
    });

    it('should throw when canonicalRoot is not a URL', function() {
      return expect(
        function() {
          return new AssetGraph({ canonicalRoot: 'foo' });
        },
        'to throw',
        /canonicalRoot must be a URL string/
      );
    });

    it('should accept an http URL', function() {
      return expect(function() {
        const assetGraph = new AssetGraph({ canonicalRoot: 'http://fisk.dk/' });

        expect(assetGraph.canonicalRoot, 'to be', 'http://fisk.dk/');
      }, 'not to throw');
    });

    it('should accept an http URL with an ip address', function() {
      return expect(function() {
        const assetGraph = new AssetGraph({
          canonicalRoot: 'http://0.0.0.0:8000/'
        });

        expect(assetGraph.canonicalRoot, 'to be', 'http://0.0.0.0:8000/');
      }, 'not to throw');
    });

    it('should add a trailing slash', function() {
      return expect(function() {
        const assetGraph = new AssetGraph({ canonicalRoot: 'http://fisk.dk' });

        expect(assetGraph.canonicalRoot, 'to be', 'http://fisk.dk/');
      }, 'not to throw');
    });

    it('should accept an http URL with a path', function() {
      return expect(function() {
        const assetGraph = new AssetGraph({
          canonicalRoot: 'http://fisk.dk/foo/bar/baz/'
        });

        expect(
          assetGraph.canonicalRoot,
          'to be',
          'http://fisk.dk/foo/bar/baz/'
        );
      }, 'not to throw');
    });

    it('should accept an http URL with a port', function() {
      return expect(function() {
        const assetGraph = new AssetGraph({
          canonicalRoot: 'http://fisk.dk:3000/'
        });

        expect(assetGraph.canonicalRoot, 'to be', 'http://fisk.dk:3000/');
      }, 'not to throw');
    });

    it('should accept an http URL with a subdomain', function() {
      return expect(function() {
        const assetGraph = new AssetGraph({
          canonicalRoot: 'http://sub.fisk.dk/'
        });

        expect(assetGraph.canonicalRoot, 'to be', 'http://sub.fisk.dk/');
      }, 'not to throw');
    });

    it('should accept an https URL', function() {
      return expect(function() {
        const assetGraph = new AssetGraph({
          canonicalRoot: 'https://fisk.dk/'
        });

        expect(assetGraph.canonicalRoot, 'to be', 'https://fisk.dk/');
      }, 'not to throw');
    });

    it('should accept a protocol relative URL', function() {
      return expect(function() {
        const assetGraph = new AssetGraph({ canonicalRoot: '//fisk.dk/' });

        expect(assetGraph.canonicalRoot, 'to be', '//fisk.dk/');
      }, 'not to throw');
    });

    it('should ensure a trailing slash ', function() {
      return expect(function() {
        const assetGraph = new AssetGraph({ canonicalRoot: '//fisk.dk' });

        expect(assetGraph.canonicalRoot, 'to be', '//fisk.dk/');
      }, 'not to throw');
    });
  });
});
