var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('Bundle stylesheets, createOneBundlePerIncludingAsset strategy').addBatch({
    'After loading a test case with 1 HTML, 2 stylesheets, and 3 images': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleAssets/singleHtml'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph contains 6 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 6);
        },
        'the graph contains 1 HTML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 1);
        },
        'the graph contains 3 PNG assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 3);
        },
        'the graph contains 2 CSS assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 2);
        },
        'the graph contains 2 HTMLStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HTMLStyle'}).length, 2);
        },
        'the graph contains 4 CSSImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CSSImage'}).length, 4);
        },
        'then bundling the HTMLStyles': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.bundleAssets({type: 'CSS', incoming: {type: 'HTMLStyle'}}, 'createOneBundlePerIncludingAsset'),
                    this.callback
                );
            },
            'the number of HTMLStyles should be down to one': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HTMLStyle'}).length, 1);
            },
            'there should be a single CSS': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 1);
            },
            'all CSSImage relations should be attached to the bundle': function (assetGraph) {
                var cssBackgroundImages = assetGraph.findRelations({type: 'CSSImage'}),
                    bundle = assetGraph.findAssets({type: 'CSS'})[0];
                assert.equal(cssBackgroundImages.length, 4);
                cssBackgroundImages.forEach(function (cssBackgroundImage) {
                    assert.equal(cssBackgroundImage.from.id, bundle.id);
                });
            }
        }
    },
    'After loading a test case with two HTML assets that relate to some of the same CSS assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleAssets/twoHtmls'}).transform(
                transforms.loadAssets('1.html', '2.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain 2 HTML assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 2);
        },
        'the graph should contain 5 CSS assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 5);
        },
        'then bundling the CSS assets': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.bundleAssets({type: 'CSS', incoming: {type: 'HTMLStyle'}}, 'createOneBundlePerIncludingAsset'),
                    this.callback
                );
            },
            'the graph should contain 2 CSS assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 2);
            },
            'the bundle attached to 1.html should consist of the rules from {a,b,c,d,e}.css in the right order': function (assetGraph) {
                var cssRules = assetGraph.findAssets({type: 'CSS', incoming: {from: {url: /\/1\.html$/}}})[0].parseTree.cssRules;
                assert.equal(cssRules.length, 5);
                assert.equal(cssRules[0].style.color, 'azure');
                assert.equal(cssRules[1].style.color, 'beige');
                assert.equal(cssRules[2].style.color, 'crimson');
                assert.equal(cssRules[3].style.color, 'deeppink');
                assert.equal(cssRules[4].style.color, '#eeeee0');
            },
            'the bundle attached to 2.html should consist of the rules from {e,b,c}.css in the right order': function (assetGraph) {
                var cssRules = assetGraph.findAssets({type: 'CSS', incoming: {from: {url: /\/2\.html$/}}})[0].parseTree.cssRules;
                assert.equal(cssRules.length, 3);
                assert.equal(cssRules[0].style.color, '#eeeee0');
                assert.equal(cssRules[1].style.color, 'beige');
                assert.equal(cssRules[2].style.color, 'crimson');
            }
        }
    }
})['export'](module);
