/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlPreloadLink', function () {
    it('should handle a test case with an existing <link rel="preload"> element', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlPreloadLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlPreloadLink');
                expect(assetGraph, 'to contain asset', 'Asset');
            })
            .run(done);
    });
});
