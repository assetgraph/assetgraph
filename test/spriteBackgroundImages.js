var vows = require('vows'),
    assert = require('assert'),
    SiteGraph = require('../SiteGraph'),
    transforms = require('../transforms');

vows.describe('Sprite background images').addBatch({
    'After loading a test case with images and spriting instructions': {
        topic: function () {
            new SiteGraph({root: __dirname + '/spriteBackgroundImages'}).applyTransform(
                transforms.addInitialAssets('style.css'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph contains 5 assets': function (siteGraph) {
            assert.equal(siteGraph.assets.length, 5);
        },
        'the graph contains 3 PNGs': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'PNG').length, 3);
        },
        'the graph contains one CSS assets': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'CSS').length, 1);
        },
        'the graph contains a single CSSSpritePlaceholder relation': function (siteGraph) {
            assert.equal(siteGraph.findRelations('type', 'CSSSpritePlaceholder').length, 1);
        },
        'the graph contains 3 CSSBackgroundImage relations': function (siteGraph) {
            assert.equal(siteGraph.findRelations('type', 'CSSBackgroundImage').length, 3);
        },
        'then spriting the background images': {
            topic: function (siteGraph) {
                siteGraph.applyTransform(transforms.spriteBackgroundImages(), this.callback);
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
