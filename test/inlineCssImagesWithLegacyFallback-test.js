var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('transforms.inlineCssImagesWithLegacyFallback').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineCssImagesWithLegacyFallback/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 4 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 4);
        },
        'the graph should contain 4 images': function (assetGraph) {
            assert.equal(assetGraph.findAssets({isImage: true}).length, 4);
        },
        'then running the inlineCssImagesWithLegacyFallback transform': {
            topic: function (assetGraph) {
                assetGraph.runTransform(transforms.inlineCssImagesWithLegacyFallback({isInitial: true}, 32768 * 3/4), this.callback);
            },
            'the graph should contain 6 Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 6);
            },
            'the graph should contain 2 HtmlConditionalComment relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlConditionalComment'}).length, 2);
            },
            'the graph should contain 3 inline CssImage relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImage', to: {isInline: true}}).length, 3);
            }
        }
    }
})['export'](module);
