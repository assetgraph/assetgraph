var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('css behavior').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cssBehavior/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain a single HTC asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTC'}).length, 1);
        }
    }
})['export'](module);
