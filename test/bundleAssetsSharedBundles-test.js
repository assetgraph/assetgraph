var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('Bundle stylesheets, sharedBundles strategy').addBatch({
    'After loading a test case with 1 Html, 2 stylesheets, and 3 images': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleAssets/singleHtml'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph contains 6 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 6);
        },
        'the graph contains 1 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph contains 3 Png assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 3);
        },
        'the graph contains 2 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 2);
        },
        'the graph contains 2 HtmlStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 2);
        },
        'the graph contains 4 CssImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 4);
        },
        'then bundling the HtmlStyles': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.bundleAssets({type: 'Css', incoming: {type: 'HtmlStyle'}}, 'sharedBundles')).run(this.callback);
            },
            'the number of HtmlStyles should be down to one': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 1);
            },
            'there should be a single Css': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
            },
            'all CssImage relations should be attached to the bundle': function (assetGraph) {
                var cssBackgroundImages = assetGraph.findRelations({type: 'CssImage'}),
                    bundle = assetGraph.findAssets({type: 'Css'})[0];
                assert.equal(cssBackgroundImages.length, 4);
                cssBackgroundImages.forEach(function (cssBackgroundImage) {
                    assert.equal(cssBackgroundImage.from.id, bundle.id);
                });
            }
        }
    },
    'After loading a test case with two Html assets that relate to some of the same Css assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleAssets/twoHtmls'}).queue(
                transforms.loadAssets('1.html', '2.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 2 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
        },
        'the graph should contain 5 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 5);
        },
        'then bundling the Css assets': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.bundleAssets({type: 'Css', incoming: {type: 'HtmlStyle'}}, 'sharedBundles')).run(this.callback);
            },
            'the graph should contain 4 Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 4);
            },
            'the Css assets with a single relation pointing at them should remain unbundled': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/a\.css$/}).length, 1);
                assert.equal(assetGraph.findAssets({url: /\/d\.css$/}).length, 1);
            },
            'e.css should remain unbundled because it occurs at different positions in 1.html and 2.html': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/e\.css$/}).length, 1);
            },
            'b.css and c.css should no longer be in the graph': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/[bc]\.css$/}).length, 0);
            },
            'the last Css asset in the graph should consist of the rules from b.css and c.css': function (assetGraph) {
                var cssAssets = assetGraph.findAssets({type: 'Css'}),
                    cssRules = cssAssets[cssAssets.length - 1].parseTree.cssRules;
                assert.equal(cssRules.length, 2);
                assert.equal(cssRules[0].style.color, 'beige');
                assert.equal(cssRules[1].style.color, 'crimson');
            }
        }
    }
})['export'](module);
