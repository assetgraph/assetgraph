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
                assetGraph.findRelations({type: 'HtmlStyle'})[0].inline();
                return assetGraph;
            },
            'there should be exactly one inline Css asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css', isInline: true}).length, 1);
            },
            'the CssImage href should be relative to the Html asset': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImage'})[0].href, 'some/directory/foo.png');
            },
            'the CssImage as found in the reserialized text of the Html asset should be relative to the Html asset': function (assetGraph) {
                var text = assetGraph.findAssets({type: 'Html'})[0].text,
                    matches = text.match(/url\((.*?foo\.png)\)/g);
                assert.isNotNull(matches);
                assert.equal(matches[1], "url(some\/directory\/foo.png)");
                assert.equal(matches.length, 2);
            }
        }
    }
})['export'](module);
