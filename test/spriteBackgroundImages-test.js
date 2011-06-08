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
        'the graph contains 3 Pngs': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 3);
        },
        'the graph contains one Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the graph contains 3 CssImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 3);
        },
        'then spriting the background images': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.spriteBackgroundImages()).run(this.callback);
            },
            'the number of Png assets should be down to one': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
            }
        }
    }
})['export'](module);
