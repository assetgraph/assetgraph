var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlMsApplicationTileImageMeta', function () {
    it('should handle a test case with an existing <meta name="msapplication-TileImage" content="..."> element', function (done) {
        new AssetGraph({root: __dirname + '/HtmlMsApplicationTileImageMeta/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlMsApplicationTileImageMeta');
                expect(assetGraph, 'to contain asset', 'Png');
            })
            .run(done);
    });
});
