/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/setSourceMapRoot', function () {
    it('should be able to modify source root', function (done) {
        new AssetGraph()
            .loadAssets(new AssetGraph.SourceMap({text: '{"sourceRoot":"rootFolder"}'}))
            .setSourceMapRoot(null, "otherFolder")
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'SourceMap');
                expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree.sourceRoot, 'to equal', 'otherFolder');
            })
            .run(done);
    });

    it('should be able to delete source root', function (done) {
        new AssetGraph()
            .loadAssets(new AssetGraph.SourceMap({text: '{"sourceRoot":"rootFolder"}'}))
            .setSourceMapRoot(null, null)
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'SourceMap');
                expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree.sourceRoot, 'to equal', void 0);
            })
            .run(done);
    });
});
