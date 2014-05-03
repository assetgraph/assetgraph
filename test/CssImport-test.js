var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('css @import').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssImport/'})
                .loadAssets('index.css')
                .populate()
                .run(done);
        },
        'the graph should contain two Css assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Css', 2);
        },
        'the graph should contain one CssImport relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'CssImport');
        },
        'then detaching the CssImport relation': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'CssImport'})[0].detach();
                return assetGraph;
            },
            'there should only be a single rule left in index.css': function (assetGraph) {
                expect(assetGraph.findAssets({url: /\/index.css$/})[0].parseTree.cssRules, 'to have length', 1);
            }
        }
    }
})['export'](module);
