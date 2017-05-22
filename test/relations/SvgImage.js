/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/SvgImage', function () {
    it('should handle a test case with <image xlink:href=...> referencing an external file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgImage/xlinkhref'})
            .loadAssets('image.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'SvgImage');
                expect(assetGraph, 'to contain asset', 'Svg');
                expect(assetGraph, 'to contain asset', 'Png');
                assetGraph.findAssets({fileName: 'foo.png'})[0].fileName = 'bar.png';
                expect(assetGraph.findAssets({fileName: 'image.svg'})[0].text, 'to contain', '<image xlink:href="bar.png"/>');
            });
    });

    it('should handle a test case with <image href=...> referencing an external file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgImage/href/'})
            .loadAssets('image.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'SvgImage');
                expect(assetGraph, 'to contain asset', 'Svg');
                expect(assetGraph, 'to contain asset', 'Png');
                assetGraph.findAssets({fileName: 'foo.png'})[0].fileName = 'bar.png';
                expect(assetGraph.findAssets({fileName: 'image.svg'})[0].text, 'to contain', '<image href="bar.png"/>');
            });
    });
});
