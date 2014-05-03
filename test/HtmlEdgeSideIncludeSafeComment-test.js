var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

vows.describe('HtmlEdgeSideIncludeSafeComment').addBatch({
    'After loading a test case with conditional comments': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlEdgeSideIncludeSafeComment/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 3);
        },
        'the graph should contain 1 inline Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true});
        },
        'the graph should contain 1 non-inline Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {type: 'Html', isInline: false});
        },
        'the graph should contain 1 Png asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Png');
        },
        'the graph should contain 1 HtmlEdgeSideIncludeSafeComment relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlEdgeSideIncludeSafeComment');
        },
        'then minify the main Html asset': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html', isInline: false})[0].minify();
                return assetGraph;
            },
            'the <!--esi ...--> should still be there': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html', isInline: false})[0].text, 'to match', /<!--esi.*-->/);
            }
        }
    }
})['export'](module);
