var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

describe('HtmlAlternateLink', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/HtmlAlternateLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlAlternateLink', 4);
                expect(assetGraph, 'to contain assets', 'Rss', 2);
                expect(assetGraph, 'to contain asset', 'Atom');
                expect(assetGraph, 'to contain asset', 'Xml');
            })
            .run(done);
    });
});
