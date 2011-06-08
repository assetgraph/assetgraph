var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('serialize asset').addBatch({
    'After loading test case with a the same Png image loaded from disc and http': {
        topic: function () {
            new AssetGraph({root: __dirname + '/getSerializedAsset/'}).queue(
                transforms.loadAssets('purplealpha24bit.png',
                                      'http://gofish.dk/purplealpha24bit.png')
            ).run(this.callback);
        },
        'then serializing the Png loaded from disc': {
            topic: function (assetGraph) {
                assetGraph.getSerializedAsset(assetGraph.findAssets()[0], this.callback);
            },
            'the length should be 8285': function (src) {
                assert.equal(src.length, 8285);
            }
        },
        'then serializing the Png loaded via http': {
            topic: function (assetGraph) {
                assetGraph.getSerializedAsset(assetGraph.findAssets()[1], this.callback);
            },
            'the length should be 8285': function (src) {
                assert.equal(src.length, 8285);
            }
        }
    }
})['export'](module);
