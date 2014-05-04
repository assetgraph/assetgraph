var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

describe('HtmlLogo', function () {
    it('should handle a test case with an existing <link rel="logo" href="..."> element', function (done) {
        new AssetGraph({root: __dirname + '/HtmlLogo/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlLogo');
                expect(assetGraph, 'to contain asset', 'Svg');
                assetGraph.findAssets({type: 'Svg'})[0].url = 'http://example.com/otherLogo.png';
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /otherLogo\.png/);
            })
            .run(done);
    });
});
