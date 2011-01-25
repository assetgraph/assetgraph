var vows = require('vows'),
    assert = require('assert'),
    SiteGraph = require('../SiteGraph'),
    transforms = require('../transforms');

vows.describe('Bundle stylesheets').addBatch({
    'After loading a test case with 1 HTML, 2 stylesheets, and 3 images': {
        topic: function () {
            var siteGraph = new SiteGraph({root: __dirname + '/bundleRelations'}),
                htmlAsset = siteGraph.registerAsset('index.html');
            transforms.populate(siteGraph, htmlAsset, function () {return true;}, this.callback);
        },
        'the graph contains the expected assets and relations': function (siteGraph) {
            assert.equal(siteGraph.assets.length, 6);
            assert.equal(siteGraph.findAssets('type', 'HTML').length, 1);
            assert.equal(siteGraph.findAssets('type', 'PNG').length, 3);
            assert.equal(siteGraph.findAssets('type', 'CSS').length, 2);
            assert.equal(siteGraph.findRelations('type', 'HTMLStyle').length, 2);
            assert.equal(siteGraph.findRelations('type', 'CSSBackgroundImage').length, 4);
        },
        'then bundling the HTMLStyles': {
            topic: function (siteGraph) {
                var htmlAsset = siteGraph.findAssets('type', 'HTML')[0],
                    htmlStyles = siteGraph.findRelations('type', 'HTMLStyle');
                transforms.bundleRelations(siteGraph, htmlStyles, this.callback);
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
