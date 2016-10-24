/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/SvgPattern', function () {
    it('should handle a test case with a <pattern xlink:href=...> referencing an external file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgPattern/xlinkhref/'})
            .loadAssets('pattern.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 2);
                expect(assetGraph, 'to contain relations', 'SvgPattern', 1);
                assetGraph.findAssets({fileName: 'gaussianBlur.svg'})[0].fileName = 'foo.svg';
                expect(assetGraph.findAssets({fileName: 'pattern.svg'})[0].text, 'to contain', '<pattern xlink:href="foo.svg" ');
            });
    });

    it('should handle a test case with a <pattern href=...> referencing an external file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgPattern/href/'})
            .loadAssets('pattern.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 2);
                expect(assetGraph, 'to contain relations', 'SvgPattern', 1);
                assetGraph.findAssets({fileName: 'gaussianBlur.svg'})[0].fileName = 'foo.svg';
                expect(assetGraph.findAssets({fileName: 'pattern.svg'})[0].text, 'to contain', '<pattern href="foo.svg" ');
            });
    });
});
