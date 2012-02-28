var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('transforms.inlineCssImagesWithLegacyFallback').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineCssImagesWithLegacyFallback/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 4);
        },
        'the graph should contain 4 images': function (assetGraph) {
            assert.equal(assetGraph.findAssets({isImage: true}).length, 4);
        },
        'then running the inlineCssImagesWithLegacyFallback transform': {
            topic: function (assetGraph) {
                assetGraph
                    .inlineCssImagesWithLegacyFallback({isInitial: true}, 32768 * 3/4)
                    .run(this.callback);
            },
            'the graph should contain 6 Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 6);
            },
            'the graph should contain 13 HtmlConditionalComment relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlConditionalComment'}).length, 13);
            },
            'the graph should contain 3 inline CssImage relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImage', to: {isInline: true}}).length, 3);
            },
            'the Html asset should contain 6 <link> tags': function (assetGraph) {
                var captures = assetGraph.findAssets({type: 'Html'})[0].text.match(/<link[^>]*>/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 6);
            },
            'the Html asset should contain 5 non-IE conditional comment markers': function (assetGraph) {
                var captures = assetGraph.findAssets({type: 'Html'})[0].text.match(/<!--\[if !IE\]>-->/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 5);
            },
            'the media=handheld attribute should occur twice now that smallImages.css has been rolled out in two versions': function (assetGraph) {
                var captures = assetGraph.findAssets({type: 'Html'})[0].text.match(/media=['"]handheld/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 2);
            },
            'the Html asset should contain 2 IE conditional comment markers with link tags in them': function (assetGraph) {
                var text = assetGraph.findAssets({type: 'Html'})[0].text;
                assert.matches(text, /<!--\[if IE\]><link[^>]*><!\[\endif]-->/);
                var captures = text.match(/<!--\[if IE\]><link[^>]*><!\[\endif]-->/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 2);
            }
        }
    }
})['export'](module);
