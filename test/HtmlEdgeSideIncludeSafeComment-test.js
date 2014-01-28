var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

vows.describe('HtmlEdgeSideIncludeSafeComment').addBatch({
    'After loading a test case with conditional comments': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlEdgeSideIncludeSafeComment/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 3);
        },
        'the graph should contain 1 inline Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html', isInline: true}).length, 1);
        },
        'the graph should contain 1 non-inline Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html', isInline: false}).length, 1);
        },
        'the graph should contain 1 Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'the graph should contain 1 HtmlEdgeSideIncludeSafeComment relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlEdgeSideIncludeSafeComment'}).length, 1);
        },
        'then minify the main Html asset': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html', isInline: false})[0].minify();
                return assetGraph;
            },
            'the <!--esi ...--> should still be there': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'Html', isInline: false})[0].text, /<!--esi.*-->/);
            }
        }
    }
})['export'](module);
