var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/requireJsConfig test', function () {
    it('should handle a test case with a shim dependency', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/registerRequireJsConfig/shimDependency'})
            .loadAssets('index.html')
            .registerRequireJsConfig()
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
            })
            .run(done);
    });
});
