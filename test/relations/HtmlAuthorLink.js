var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlAuthorLink', function () {
    it('should handle a test case with an existing <link rel="author">', function (done) {
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
