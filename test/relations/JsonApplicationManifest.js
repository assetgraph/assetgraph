/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JsonApplicationManifest', function () {
    it('should handle a test case with an existing <link rel="manifest">', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JsonApplicationManifest/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JsonApplicationManifest', 1);
            })
            .run(done);
    });
});
