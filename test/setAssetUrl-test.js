var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('Changing the url of assets').addBatch({
    'After loading a test case with three assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/simple/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 3);
        },
        'the graph should contain 2 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
        },
        'the graph should contain one Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'then moving the first Html asset one level down': {
            topic: function (assetGraph) {
                var initialHtml = assetGraph.findAssets({type: 'Html'})[0];
                initialHtml.url = urlTools.resolveUrl(assetGraph.root, 'bogus/index.html');
                return assetGraph;
            },
            'the relative url of the anchor relation should have changed': function (assetGraph) {
                var relativeUrl = assetGraph.findRelations({type: 'HtmlAnchor'})[0].node.getAttribute('href');
                assert.equal(relativeUrl, '../otherpage.html');
            },
            'then moving the other page one level down': {
                topic: function (assetGraph) {
                    var otherHtml = assetGraph.findAssets({type: 'Html'})[1];
                    otherHtml.url = urlTools.resolveUrl(assetGraph.root, 'fluff/otherpage.html');
                    return assetGraph;
                },
                'the relative url of the anchor relation should be updated': function (assetGraph) {
                    var relativeUrl = assetGraph.findRelations({type: 'HtmlAnchor'})[0].node.getAttribute('href');
                    assert.equal(relativeUrl, '../fluff/otherpage.html');
                },
                'the relative url of the image relation should be updated': function (assetGraph) {
                    var relativeUrl = assetGraph.findRelations({type: 'HtmlImage'})[0].node.getAttribute('src');
                    assert.equal(relativeUrl, '../foo.png');
                }
            }
        }
    },
    'After loading a test case with an Html asset that has multiple levels of inline assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/multipleLevelsOfInline/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should a single Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the graph should a single inline Html asset (conditional comment)': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html', isInline: true}).length, 1);
        },
        'the graph should a single non-inline Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html', isInline: false}).length, 1);
        },
        'then moving the Html asset one level down': {
            topic: function (assetGraph) {
                assetGraph.queue(
                    transforms.moveAssets({type: 'Html', isInline: false}, function (asset) {
                        return urlTools.resolveUrl(assetGraph.root, "subdir/index.html");
                    })
                ).run(this.callback);
            },
            'the CssImage url should be relative to /subdir': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImage'})[0].cssRule.style['background-image'], 'url(../foo.png)');
            }
        }
    },
    'After loading a test case with an Html asset and a distant Htc asset that has the Html as its base asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/nonTrivialBaseAsset/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain three Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 3);
        },
        'the graph should contain a single Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain a single Htc asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Htc'}).length, 1);
        },
        'then moving the Html asset one level down': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html', isInline: false})[0].url = urlTools.resolveUrl(assetGraph.root, 'subdir/index.html');
                return assetGraph;
            },
            'the CssBehavior url should be relative to /subdir': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssBehavior'})[0].cssRule.style.behavior, 'url(theBehavior.htc)');
            }
        }
    }
})['export'](module);
