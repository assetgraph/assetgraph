var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

describe('HtmlSearchLink', function () {
    it('should handle a test case with an existing <link rel="search"> element', function (done) {
        new AssetGraph({root: __dirname + '/HtmlSearchLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlSearchLink');
                expect(assetGraph, 'to contain asset', 'Xml');
            })
            .run(done);
    });
});
