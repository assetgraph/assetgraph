var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('get raw src of asset').addBatch({
    'After loading test case with the same Png image loaded from disc and http': {
        topic: function () {
            new AssetGraph({root: __dirname + '/rawSrc/'})
                .loadAssets('purplealpha24bit.png', 'http://gofish.dk/purplealpha24bit.png')
                .run(this.callback)
        },
        'then serializing the Png loaded from disc': {
            topic: function (assetGraph) {
                return assetGraph.findAssets()[0].rawSrc;
            },
            'the length should be 8285': function (rawSrc) {
                assert.equal(rawSrc.length, 8285);
            }
        },
        'then serializing the Png loaded via http': {
            topic: function (assetGraph) {
                return assetGraph.findAssets()[1].rawSrc;
            },
            'the length should be 8285': function (rawSrc) {
                assert.equal(rawSrc.length, 8285);
            }
        }
    }
})['export'](module);
