var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

describe('Html with <link rel="author">', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/HtmlAuthorLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlAuthorLink', 2);
                expect(assetGraph, 'to contain assets', 'Text', 2);
            })
            .run(done);
    });
});
