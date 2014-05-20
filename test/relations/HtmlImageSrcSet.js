/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlImageSrcSet, relations/SrcSet, relations/SrcSetEntry', function () {
    it('should handle a test case with an existing <img srcset=...> element', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlImageSrcSet/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 6);
                expect(assetGraph, 'to contain relation', 'HtmlImage');
                expect(assetGraph, 'to contain relation', 'HtmlImageSrcSet');
                expect(assetGraph, 'to contain asset', 'SrcSet');
                expect(assetGraph, 'to contain relations', 'SrcSetEntry', 3);

                assetGraph.findAssets({url: /\/banner-phone\.jpeg$/})[0].url = 'http://example.com/foo.jpg';

                expect(
                    assetGraph.findAssets({url: /\/index\.html$/})[0].text,
                    'to match',
                    /srcset=\"banner-HD\.jpeg 2x, http:\/\/example.com\/foo\.jpg 100w, banner-phone-HD\.jpeg 100w 2x\"/
                );
            })
            .run(done);
    });
});
