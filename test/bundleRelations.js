var vows = require('vows'),
    assert = require('assert'),
    SiteGraph = require('../SiteGraph'),
    transforms = require('../transforms');

vows.describe('Bundle stylesheets').addBatch({
    'After loading a test case with 1 HTML, 2 stylesheets, and 3 images': {
        topic: function () {
            new SiteGraph({root: __dirname + '/bundleRelations'}).applyTransform(
                transforms.addInitialAssets('index.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph contains 6 assets': function (siteGraph) {
            assert.equal(siteGraph.assets.length, 6);
        },
        'the graph contains 1 HTML asset': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'HTML').length, 1);
        },
        'the graph contains 3 PNG assets': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'PNG').length, 3);
        },
        'the graph contains 2 CSS assets': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'CSS').length, 2);
        },
        'the graph contains 2 HTMLStyle relations': function (siteGraph) {
            assert.equal(siteGraph.findRelations('type', 'HTMLStyle').length, 2);
        },
        'the graph contains 4 CSSBackgroundImage relations': function (siteGraph) {
            assert.equal(siteGraph.findRelations('type', 'CSSBackgroundImage').length, 4);
        },
        'then bundling the HTMLStyles': {
            topic: function (siteGraph) {
                siteGraph.applyTransform(
                    transforms.bundleJavaScriptAndCSS(),
                    this.callback
                );
            },
            'the number of HTMLStyles should be down to one': function (siteGraph) {
                assert.equal(siteGraph.findRelations('type', 'HTMLStyle').length, 1);
            },
            'there should be a single CSS': function (siteGraph) {
                assert.equal(siteGraph.findAssets('type', 'CSS').length, 1);
            },
            'the CSSBackgroundImage relations should be reregistered to the bundle': function (siteGraph) {
                var cssBackgroundImages = siteGraph.findRelations('type', 'CSSBackgroundImage'),
                    bundle = siteGraph.findAssets('type', 'CSS')[0];
                assert.equal(cssBackgroundImages.length, 4);
                cssBackgroundImages.forEach(function (cssBackgroundImage) {
                    assert.equal(cssBackgroundImage.from, bundle);
                });
            }
        }
    }
})['export'](module);
