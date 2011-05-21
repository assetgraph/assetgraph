var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('css @media rule').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cssMediaRule/'}).queue(
                transforms.loadAssets('relationInMediaRule.css'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain two CSSImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CSSImage'}).length, 2);
        }
    }
})['export'](module);
