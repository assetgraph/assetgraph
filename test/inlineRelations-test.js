var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('Inlining relations').addBatch({
    'After loading a test case with an Html asset that has an external Css asset in a conditional comment': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineRelations/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 4);
        },
        'the graph should contain 2 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
        },
        'the graph should contain one Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the graph should contain one Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'then inlining the Css and getting the Html as text': {
            topic: function (assetGraph) {
                var callback = this.callback;
                assetGraph.inlineRelation(assetGraph.findRelations({type: 'HtmlStyle'})[0], function (err) {
                    if (err) {
                        return callback(err);
                    }
                    assetGraph.getAssetText(assetGraph.findAssets({type: 'Html', url: query.isDefined})[0], callback);
                });
            },
            'the CssImage url should be relative to the Html asset': function (src) {
                var matches = src.match(/url\(some\/directory\/foo\.png\)/g);
                assert.equal(matches.length, 2);
            }
        }
    }
})['export'](module);
