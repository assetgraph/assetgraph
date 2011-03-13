var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('Sprite background images').addBatch({
    'After loading a test case with images and spriting instructions': {
        topic: function () {
            new AssetGraph({root: __dirname + '/spriteBackgroundImages'}).transform(
                transforms.loadAssets('style.css'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph contains 5 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 5);
        },
        'the graph contains 3 PNGs': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 3);
        },
        'the graph contains one CSS asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 1);
        },
        'the graph contains a single CSSSpritePlaceholder relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CSSSpritePlaceholder'}).length, 1);
        },
        'the graph contains 3 CSSImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CSSImage'}).length, 3);
        },
        'then spriting the background images': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.spriteBackgroundImages(),
                    this.callback
                );
            },
            'the number of PNG assets should be down to one': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 1);
            },
            'the sprite placeholder should be gone': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CSSSpritePlaceholder'}).length, 0);
            }
        }
    }
})['export'](module);
