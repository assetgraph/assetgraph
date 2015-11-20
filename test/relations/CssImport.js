/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/CssImport', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssImport/'})
            .loadAssets('index.css')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 2);
                expect(assetGraph, 'to contain relation', 'CssImport');
                assetGraph.findRelations({type: 'CssImport'})[0].detach();
                expect(assetGraph.findAssets({url: /\/index.css$/})[0].parseTree.nodes, 'to have length', 1);
            })
            .run(done);
    });
});
