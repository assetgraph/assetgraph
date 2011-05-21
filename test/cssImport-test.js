var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('css @import').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cssImport/'}).queue(
                transforms.loadAssets('index.css'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain two CSS assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 2);
        },
        'the graph should contain one CSSImport relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CSSImport'}).length, 1);
        },
        'then removing the CSSImport relation': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'CSSImport'})[0].remove();
                return assetGraph;
            },
            'there should only be a single rule left in index.css': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/index.css$/})[0].parseTree.cssRules.length, 1);
            }
        }
    }
})['export'](module);
