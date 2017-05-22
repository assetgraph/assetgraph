/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/SvgAnchor', function () {
    it('should handle a test case with <a xlink:href=...> referencing an external file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgAnchor/xlinkhref'})
            .loadAssets('image.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'SvgAnchor');
                expect(assetGraph, 'to contain asset', 'Svg');
                expect(assetGraph, 'to contain asset', 'Png');
                assetGraph.findAssets({fileName: 'foo.png'})[0].fileName = 'bar.png';
                expect(assetGraph.findAssets({fileName: 'image.svg'})[0].text, 'to contain', '<a xlink:href="bar.png">');
            });
    });

    it('should handle a test case with <a href=...> referencing an external file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgAnchor/href/'})
            .loadAssets('image.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'SvgAnchor');
                expect(assetGraph, 'to contain asset', 'Svg');
                expect(assetGraph, 'to contain asset', 'Png');
                assetGraph.findAssets({fileName: 'foo.png'})[0].fileName = 'bar.png';
                expect(assetGraph.findAssets({fileName: 'image.svg'})[0].text, 'to contain', '<a href="bar.png">');
            });
    });
});
