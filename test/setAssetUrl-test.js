var URL = require('url'),
    vows = require('vows'),
    assert = require('assert'),
    step = require('step'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('Changing the url of assets').addBatch({
    'After loading a test case with three assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/simple/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain 3 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 3);
        },
        'the graph should contain 2 HTML files': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 2);
        },
        'the graph should contain one PNG asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 1);
        },
        'then moving the first HTML asset one level down:': {
            topic: function (assetGraph) {
                var initialHTML = assetGraph.findAssets({type: 'HTML'})[0];
                assetGraph.setAssetUrl(initialHTML, assetGraph.resolver.root + 'bogus/index.html');
                return assetGraph;
            },
            'the relative url of the anchor relation should have changed': function (assetGraph) {
                var relativeUrl = assetGraph.findRelations({type: 'HTMLAnchor'})[0].node.getAttribute('href');
                assert.equal(relativeUrl, '../otherpage.html');
            },
            'then moving the other page one level down': {
                topic: function (assetGraph) {
                    var otherHTML = assetGraph.findAssets({type: 'HTML'})[1];
                    assetGraph.setAssetUrl(otherHTML, assetGraph.resolver.root + 'fluff/otherpage.html');
                    return assetGraph;
                },
                'the relative url of the anchor relation should be updated': function (assetGraph) {
                    var relativeUrl = assetGraph.findRelations({type: 'HTMLAnchor'})[0].node.getAttribute('href');
                    assert.equal(relativeUrl, '../fluff/otherpage.html');
                },
                'the relative url of the image relation should be updated': function (assetGraph) {
                    var relativeUrl = assetGraph.findRelations({type: 'HTMLImage'})[0].node.getAttribute('src');
                    assert.equal(relativeUrl, '../foo.png');
                }
            }
        }
    },
    'After loading a test case with an HTML asset that has multiple levels of inline assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/multipleLevelsOfInline/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should a single CSS asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 1);
        },
        'the graph should a single inline HTML asset (conditional comment)': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML', url: query.undefined}).length, 1);
        },
        'the graph should a single non-inline HTML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML', url: query.defined}).length, 1);
        },
        'then moving the HTML asset one level down': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.moveAssets({type: 'HTML', url: query.defined}, function (asset) {
                        return assetGraph.resolver.root + "subdir/index.html";
                    }),
                    this.callback
                );
            },
            'the CSSBackgroundImage url should be relative to /subdir': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CSSBackgroundImage'})[0].cssRule.style['background-image'], 'url(../foo.png)');
            }
        }
    },
    'After loading a test case with an HTML asset and a distant HTC asset that has the HTML as its base asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/nonTrivialBaseAsset/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain three CSS assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 3);
        },
        'the graph should contain a single HTML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 1);
        },
        'the graph should contain a single HTC asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTC'}).length, 1);
        },
        'then moving the HTML asset one level down': {
            topic: function (assetGraph) {
                assetGraph.setAssetUrl(assetGraph.findAssets({type: 'HTML', url: query.defined})[0], assetGraph.resolver.root + 'subdir/index.html');
                return assetGraph;
            },
            'the CSSBehavior url should be relative to /subdir': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CSSBehavior'})[0].cssRule.style.behavior, 'url(theBehavior.htc)');
            }
        }
    }
})['export'](module);
