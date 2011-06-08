var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('relations.CssImage').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssImage/'}).queue(
                transforms.loadAssets('index.css'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 9 CssImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 9);
        }
    }
})['export'](module);
