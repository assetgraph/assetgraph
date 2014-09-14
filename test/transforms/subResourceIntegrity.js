/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query;

describe('transforms/subResourceIntegrity', function () {
    it('should load external sources', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/subResourceIntegrity/'})
            .loadAssets('index.html')
            .populate({followRelations: {to: {url: query.not(/^https?:/)}}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain no assets', 'JavaScript');
            })
            .subResourceIntegrity()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'JavaScript');

                expect(assetGraph.findRelations(), 'to be an array whose items satisfy', function (relation) {
                    expect(relation.node.getAttribute('integrity'), 'to match', /^ni/);
                });
            })
            .run(done);
    });
});
