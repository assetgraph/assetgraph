/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/SvgUse', function () {
    it('should handle a test case with a <use xlink:href=...> referencing an external file', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/SvgUse/'})
            .loadAssets('user.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'SvgUse', 1);
                expect(assetGraph, 'to contain assets', 'Svg', 2);
            })
            .run(done);
    });
});
