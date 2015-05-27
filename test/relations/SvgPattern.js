/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/SvgPattern', function () {
    it('should handle a test case with a <pattern xlink:href=...> referencing an external file', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/SvgPattern/'})
            .loadAssets('pattern.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 2);
                expect(assetGraph, 'to contain relations', 'SvgPattern', 1);
            })
            .run(done);
    });
});
