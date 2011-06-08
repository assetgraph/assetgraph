var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('relations.CssBehavior').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssBehavior/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain a single Htc asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Htc'}).length, 1);
        }
    }
})['export'](module);
