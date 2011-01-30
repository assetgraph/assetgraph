var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('Bundle stylesheets').addBatch({
    'After loading a test case with 1 HTML, 2 stylesheets, and 3 images': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations'}).transform(
                transforms.addAssets('index.html'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph contains 6 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 6);
        },
        'the graph contains 1 HTML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets('type', 'HTML').length, 1);
        },
        'the graph contains 3 PNG assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets('type', 'PNG').length, 3);
        },
        'the graph contains 2 CSS assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets('type', 'CSS').length, 2);
        },
        'the graph contains 2 HTMLStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations('type', 'HTMLStyle').length, 2);
        },
        'the graph contains 4 CSSBackgroundImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations('type', 'CSSBackgroundImage').length, 4);
        },
        'then bundling the HTMLStyles': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.bundleJavaScriptAndCSS(),
                    transforms.escapeToCallback(this.callback)
                );
            },
            'the number of HTMLStyles should be down to one': function (assetGraph) {
                assert.equal(assetGraph.findRelations('type', 'HTMLStyle').length, 1);
            },
            'there should be a single CSS': function (assetGraph) {
                assert.equal(assetGraph.findAssets('type', 'CSS').length, 1);
            },
            'the CSSBackgroundImage relations should be attached to the bundle': function (assetGraph) {
                var cssBackgroundImages = assetGraph.findRelations('type', 'CSSBackgroundImage'),
                    bundle = assetGraph.findAssets('type', 'CSS')[0];
                assert.equal(cssBackgroundImages.length, 4);
                cssBackgroundImages.forEach(function (cssBackgroundImage) {
                    assert.equal(cssBackgroundImage.from, bundle);
                });
            }
        }
    }
})['export'](module);
