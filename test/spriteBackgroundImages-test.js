var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('Sprite background images').addBatch({
    'After loading a test case with images and spriting instructions': {
        topic: function () {
            new AssetGraph({root: __dirname + '/spriteBackgroundImages'}).queue(
                transforms.loadAssets('style.css'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph contains 4 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 4);
        },
        'the graph contains 3 PNGs': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 3);
        },
        'the graph contains one CSS asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 1);
        },
        'the graph contains 3 CSSImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CSSImage'}).length, 3);
        },
        'then spriting the background images': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.spriteBackgroundImages()).run(this.callback);
            },
            'the number of PNG assets should be down to one': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 1);
            }
        }
    }
})['export'](module);
