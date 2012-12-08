var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('HtmlImageSrcSet, ImageSrcSet, ImageSrcSetEntry').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlImageSrcSet/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 6 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 6);
        },
        'the graph should contain 1 HtmlImage relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlImage'}).length, 1);
        },
        'the graph should contain 1 HtmlImageSrcSet relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlImageSrcSet'}).length, 1);
        },
        'the graph should contain 1 ImageSrcSet asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'ImageSrcSet'}).length, 1);
        },
        'the graph should contain 3 ImageSrcSetEntry relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'ImageSrcSetEntry'}).length, 3);
        },
        'then update the url of banner-phone.jpeg': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/banner-phone\.jpeg$/})[0].url = 'http://example.com/foo.jpg';
                return assetGraph;
            },
            'the Html asset should be updated with the new url in the srcset': function (assetGraph) {
                assert.matches(assetGraph.findAssets({url: /\/index\.html$/})[0].text,
                               /srcset=\"banner-HD\.jpeg 2x, http:\/\/example.com\/foo\.jpg 100w, banner-phone-HD\.jpeg 100w 2x\"/);
            }
        }
    }
})['export'](module);
