/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlFluidIconLink', function () {
    it('should handle a test case with an existing <link rel="fluid-icon"> element', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlFluidIconLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlFluidIconLink');
                expect(assetGraph, 'to contain asset', 'Png');
            })
            .run(done);
    });
});
