var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('Remove empty assets').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/removeEmptyAssets/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 3);
        },
        'then running the removeEmptyAssets transform on CSS and JavaScript assets': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.removeEmptyAssets({type: query.or('CSS', 'JavaScript')})).run(this.callback);
            },
            'the graph should contain 1 asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets().length, 1);
            },
            'the graph should contain no relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations().length, 0);
            }
        }
    }
})['export'](module);
