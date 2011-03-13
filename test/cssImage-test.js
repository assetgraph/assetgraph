var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('CSS images').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cssImage/'}).transform(
                transforms.loadAssets('index.css'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain 9 CSSImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CSSImage'}).length, 9);
        }
    }
})['export'](module);
