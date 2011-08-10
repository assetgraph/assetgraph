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
                assetGraph.inlineRelation(assetGraph.findRelations({type: 'HtmlStyle'})[0]);
                return assetGraph.findAssets({type: 'Html', isInline: true})[0].text;
            },
            'the CssImage url should be relative to the Html asset': function (text) {
                var matches = text.match(/url\(some\/directory\/foo\.png\)/g);
                assert.isNotNull(matches);
                assert.equal(matches.length, 2);
            }
        }
    }
})['export'](module);
