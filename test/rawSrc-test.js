var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    transforms = AssetGraph.transforms;

vows.describe('get raw src of asset').addBatch({
    'After loading test case with the same Png image loaded from disc and http': {
        topic: function () {
            new AssetGraph({root: __dirname + '/rawSrc/'})
                .loadAssets('purplealpha24bit.png', 'http://gofish.dk/purplealpha24bit.png')
                .run(done);
        },
        'then serializing the Png loaded from disc': {
            topic: function (assetGraph) {
                return assetGraph.findAssets()[0].rawSrc;
            },
            'the length should be 8285': function (rawSrc) {
                expect(rawSrc, 'to have length', 8285);
            }
        },
        'then serializing the Png loaded via http': {
            topic: function (assetGraph) {
                return assetGraph.findAssets()[1].rawSrc;
            },
            'the length should be 8285': function (rawSrc) {
                expect(rawSrc, 'to have length', 8285);
            }
        }
    }
})['export'](module);
