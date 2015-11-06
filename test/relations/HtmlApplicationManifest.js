/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlApplicationManifest', function () {
    it('should handle a test case with an existing <link rel="manifest">', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlApplicationManifest/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlApplicationManifest', 1);
                expect(assetGraph, 'to contain assets', 'ApplicationManifest', 1);
            })
            .run(done);
    });
});
