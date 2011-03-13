var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('css @media rule').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cssMediaRule/'}).transform(
                transforms.loadAssets('relationInMediaRule.css'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain two CSSImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CSSImage'}).length, 2);
        }
    }
})['export'](module);
