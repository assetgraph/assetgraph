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
        'the graph should contain 3 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 3);
        },
        'the graph should contain 3 images': function (assetGraph) {
            assert.equal(assetGraph.findAssets({isImage: true}).length, 3);
        },
        'then running the inlineCssImagesWithLegacyFallback transform': {
            topic: function (assetGraph) {
                assetGraph.runTransform(transforms.inlineCssImagesWithLegacyFallback({isInitial: true}), this.callback);
            },
            'the graph should contain 4 Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 4);
            },
            'the graph should contain a HtmlConditionalComment relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlConditionalComment'}).length, 1);
            },
            'the graph should contain two inline CssImage relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImage', to: {isInline: true}}).length, 2);
            }
        }
    }
})['export'](module);
