var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

describe('CssImport', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/CssImport/'})
            .loadAssets('index.css')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 2);
                expect(assetGraph, 'to contain relation', 'CssImport');
                assetGraph.findRelations({type: 'CssImport'})[0].detach();
                expect(assetGraph.findAssets({url: /\/index.css$/})[0].parseTree.cssRules, 'to have length', 1);
            })
            .run(done);
    });
});
