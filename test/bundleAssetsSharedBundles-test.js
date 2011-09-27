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
    },
    'After loading a test case with 5 HtmlStyles in a Html asset, two of which is in a conditional comment': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleAssets/conditionalCommentInTheMiddle/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 5 HtmlStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 5);
        },
        'the graph should contain 2 HtmlConditionalComment relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlConditionalComment'}).length, 2);
        },
        'then bundling the HtmlStyles': {
            topic: function (assetGraph) {
                assetGraph.runTransform(transforms.bundleAssets({type: 'Css', incoming: {type: 'HtmlStyle'}}, 'sharedBundles'), this.callback);
            },
            'the graph should contain 3 HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 3);
            },
            'index.html should have 2 outgoing HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'}).length, 2);
            },
            'the first outgoing HtmlStyle relation of the Html asset should be a.css and b.css bundled': function (assetGraph) {
                var cssRules = assetGraph.findRelations({from: {url: /\/index\.html$/}})[0].to.parseTree.cssRules;
                assert.equal(cssRules.length, 2);
                assert.equal(cssRules[0].style.getPropertyValue('color'), '#aaaaaa');
                assert.equal(cssRules[1].style.getPropertyValue('color'), '#bbbbbb');
            },
            'the second outgoing HtmlStyle relation of the Html asset should be the original e.css': function (assetGraph) {
                var cssAsset = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].to;
                assert.matches(cssAsset.url, /\/e\.css$/);
                assert.equal(cssAsset.parseTree.cssRules.length, 1);
                assert.equal(cssAsset.parseTree.cssRules[0].style.getPropertyValue('color'), '#eeeeee');
            },
            'the second conditional comment should have one outgoing HtmlStyle relation consisting of the rules from c.css and d.css': function (assetGraph) {
                var conditionalCommentBody = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlConditionalComment'})[1].to,
                    htmlStyles = assetGraph.findRelations({from: conditionalCommentBody});
                assert.equal(htmlStyles.length, 1);
                assert.equal(htmlStyles[0].to.parseTree.cssRules.length, 2);
                assert.equal(htmlStyles[0].to.parseTree.cssRules[0].style.getPropertyValue('color'), '#cccccc');
                assert.equal(htmlStyles[0].to.parseTree.cssRules[1].style.getPropertyValue('color'), '#dddddd');
            }
        }
    }
})['export'](module);
