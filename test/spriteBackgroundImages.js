var vows = require('vows'),
    assert = require('assert'),
    SiteGraph = require('../SiteGraph'),
    transforms = require('../transforms');

vows.describe('Sprite background images').addBatch({
    'After loading a test case with images and spriting instructions': {
        topic: function () {
            var siteGraph = new SiteGraph({root: __dirname + '/spriteBackgroundImages'}),
                styleAsset = siteGraph.registerAsset('style.css');
            transforms.populate(siteGraph, styleAsset, function () {return true;}, this.callback);
        },
        'the graph contains the expected assets and relations': function (siteGraph) {
            assert.equal(siteGraph.assets.length, 5);
            assert.equal(siteGraph.findAssets('type', 'PNG').length, 3);
            assert.equal(siteGraph.findAssets('type', 'CSS').length, 1);
            assert.equal(siteGraph.findRelations('type', 'CSSSpritePlaceholder').length, 1);
            assert.equal(siteGraph.findRelations('type', 'CSSBackgroundImage').length, 3);
        },
        'then spriting the background images': {
            topic: function (siteGraph) {
                transforms.spriteBackgroundImages(siteGraph, this.callback);
            },
            'the number of PNG assets should be down to one': function (siteGraph) {
                assert.equal(siteGraph.findAssets('type', 'PNG').length, 1);
            },
            'the sprite placeholder should be gone': function (siteGraph) {
                assert.equal(siteGraph.findRelations('type', 'CSSSpritePlaceholder').length, 0);
            }
        }
    }
})['export'](module);
