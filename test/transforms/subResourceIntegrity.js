/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/subResourceIntegrity', function () {
    it('should load external sources', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/subResourceIntegrity/'})
            .loadAssets('index.html')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain no assets', 'JavaScript');
            })
            .subResourceIntegrity()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'JavaScript');

                var relations = assetGraph.findRelations();
                expect(relations, 'to have length', 1);
                expect(relations, 'to be an array whose items satisfy', function (relation) {
                    expect(relation.node.getAttribute('integrity'), 'to be', 'ni:///sha256;h0cGsrExGgcZtSZ/fRz4AwV+Nn6Urh/3v3jFRQ0w9dQ=?ct=application/javascript');
                });
            })
            .run(done);
    });
});
