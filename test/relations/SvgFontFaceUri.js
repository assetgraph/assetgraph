/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/SvgFontFaceUri', function () {
    it('should handle a test case with a <font-face-uri xlink:href=...> referencing an external file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgFontFaceUri/xlinkhref/'})
            .loadAssets('image.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Svg');
                expect(assetGraph, 'to contain relations', 'SvgFontFaceUri', 1);
                assetGraph.findAssets({fileName: 'fontawesome-webfont.ttf'})[0].fileName = 'foo.ttf';
                expect(assetGraph.findAssets({fileName: 'image.svg'})[0].text, 'to contain', '<font-face-uri xlink:href="foo.ttf"/>');
            });
    });

    it('should handle a test case with a <font-face-uri href=...> referencing an external file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgFontFaceUri/href/'})
            .loadAssets('image.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Svg');
                expect(assetGraph, 'to contain relations', 'SvgFontFaceUri', 1);
                assetGraph.findAssets({fileName: 'fontawesome-webfont.ttf'})[0].fileName = 'foo.ttf';
                expect(assetGraph.findAssets({fileName: 'image.svg'})[0].text, 'to contain', '<font-face-uri href="foo.ttf"/>');
            });
    });
});
