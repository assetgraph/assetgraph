var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('HtmlImageSrcSet, SrcSet, SrcSetEntry').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlImageSrcSet/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 6 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 6);
        },
        'the graph should contain 1 HtmlImage relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlImage');
        },
        'the graph should contain 1 HtmlImageSrcSet relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlImageSrcSet');
        },
        'the graph should contain 1 SrcSet asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'SrcSet');
        },
        'the graph should contain 3 SrcSetEntry relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'SrcSetEntry', 3);
        },
        'then update the url of banner-phone.jpeg': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/banner-phone\.jpeg$/})[0].url = 'http://example.com/foo.jpg';
                return assetGraph;
            },
            'the Html asset should be updated with the new url in the srcset': function (assetGraph) {
                expect(assetGraph.findAssets({url: /\/index\.html$/})[0].text, 'to match',
                               /srcset=\"banner-HD\.jpeg 2x, http:\/\/example.com\/foo\.jpg 100w, banner-phone-HD\.jpeg 100w 2x\"/);
            }
        }
    }
})['export'](module);
