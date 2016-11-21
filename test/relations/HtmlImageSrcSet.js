/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlImageSrcSet, relations/SrcSet, relations/SrcSetEntry', function () {
    it('should handle a test case with an existing <img srcset=...> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlImageSrcSet/existing'})
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
            });
    });

    it('should allow non-URL encoded commas in the srcset urls as long as they are not the first or the last character', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlImageSrcSet/commas'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 4);
                expect(assetGraph, 'to contain relation', 'HtmlImageSrcSet');
                expect(assetGraph, 'to contain asset', 'SrcSet');
                expect(assetGraph, 'to contain relations including unresolved', 'SrcSetEntry', 2);
                expect(assetGraph, 'to contain relations', 'SrcSetEntry', 2);

                expect(assetGraph, 'to contain asset', {fileName: 'banner-phone.jpeg'});
                expect(assetGraph, 'to contain asset', {fileName: 'banner,HD.jpeg'});

                assetGraph.findAssets({url: /\/banner,HD\.jpeg$/})[0].url = 'http://example.com/foo.jpg';

                expect(
                    assetGraph.findAssets({url: /\/index\.html$/})[0].text,
                    'to contain',
                    'srcset="http://example.com/foo.jpg 2x, banner-phone.jpeg?foo,bar 100w 2x"'
                );
            });
    });
});
