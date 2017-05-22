/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/SvgUse', function () {
    it('should handle a test case with a <use xlink:href=...> referencing an external file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgUse/xlinkhref'})
            .loadAssets('user.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'SvgUse', 1);
                expect(assetGraph, 'to contain assets', 'Svg', 2);
                assetGraph.findAssets({fileName: 'gaussianBlur.svg'})[0].fileName = 'foo.svg';
                expect(assetGraph.findAssets({fileName: 'user.svg'})[0].text, 'to contain', '<use xlink:href="foo.svg"/>');
            });
    });

    it('should handle a test case with a <use href=...> referencing an external file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgUse/href/'})
            .loadAssets('user.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'SvgUse', 1);
                expect(assetGraph, 'to contain assets', 'Svg', 2);
                assetGraph.findAssets({fileName: 'gaussianBlur.svg'})[0].fileName = 'foo.svg';
                expect(assetGraph.findAssets({fileName: 'user.svg'})[0].text, 'to contain', '<use href="foo.svg"/>');
            });
    });
});
