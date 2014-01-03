var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('css @import').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssImport/'})
                .loadAssets('index.css')
                .populate()
                .run(this.callback);
        },
        'the graph should contain two Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 2);
        },
        'the graph should contain one CssImport relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImport'}).length, 1);
        },
        'then detaching the CssImport relation': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'CssImport'})[0].detach();
                return assetGraph;
            },
            'there should only be a single rule left in index.css': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/index.css$/})[0].parseTree.cssRules.length, 1);
            }
        }
    }
})['export'](module);
