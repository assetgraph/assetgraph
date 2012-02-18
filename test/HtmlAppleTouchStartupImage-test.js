var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('relations.HtmlAppleTouchStartupImage').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlAppleTouchStartupImage/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback)
        },
        'the graph should contain 2 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 2);
        },
        'the graph should contain one HtmlAppleTouchStartupImage relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlAppleTouchStartupImage'}).length, 1);
        },
        'then attach two more HtmlAppleTouchStartupImage relation before and after the existing one': {
            topic: function (assetGraph) {
                var htmlAsset = assetGraph.findAssets({type: 'Html'})[0],
                    pngAsset = assetGraph.findAssets({type: 'Png'})[0],
                    existingHtmlAppleTouchStartupImageRelation = assetGraph.findRelations({type: 'HtmlAppleTouchStartupImage'})[0];
                new AssetGraph.relations.HtmlAppleTouchStartupImage({
                    from: htmlAsset,
                    to: pngAsset
                }).attach(htmlAsset, 'after', existingHtmlAppleTouchStartupImageRelation);
                new AssetGraph.relations.HtmlAppleTouchStartupImage({
                    from: htmlAsset,
                    to: pngAsset
                }).attach(htmlAsset, 'before', existingHtmlAppleTouchStartupImageRelation);
                return assetGraph;
            },
            'the graph should contain 3 HtmlAppleTouchStartupImage relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlAppleTouchStartupImage'}).length, 3);
            },
            'the Html should contain three properly formatted <link> tags': function (assetGraph) {
                var matches = assetGraph.findAssets({type: 'Html'})[0].text.match(/<link rel="apple-touch-startup-image" href="foo.png">/g);
                assert.isNotNull(matches);
                assert.equal(matches.length, 3);
            }
        }
    }
})['export'](module);
