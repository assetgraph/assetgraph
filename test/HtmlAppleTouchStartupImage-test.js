var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('relations.HtmlAppleTouchStartupImage').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlAppleTouchStartupImage/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 2);
        },
        'the graph should contain one HtmlAppleTouchStartupImage relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlAppleTouchStartupImage');
        },
        'then attach two more HtmlAppleTouchStartupImage relation before and after the existing one': {
            topic: function (assetGraph) {
                var htmlAsset = assetGraph.findAssets({type: 'Html'})[0],
                    pngAsset = assetGraph.findAssets({type: 'Png'})[0],
                    existingHtmlAppleTouchStartupImageRelation = assetGraph.findRelations({type: 'HtmlAppleTouchStartupImage'})[0];
                new AssetGraph.HtmlAppleTouchStartupImage({
                    from: htmlAsset,
                    to: pngAsset
                }).attach(htmlAsset, 'after', existingHtmlAppleTouchStartupImageRelation);
                new AssetGraph.HtmlAppleTouchStartupImage({
                    from: htmlAsset,
                    to: pngAsset
                }).attach(htmlAsset, 'before', existingHtmlAppleTouchStartupImageRelation);
                return assetGraph;
            },
            'the graph should contain 3 HtmlAppleTouchStartupImage relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlAppleTouchStartupImage', 3);
            },
            'the Html should contain three properly formatted <link> tags': function (assetGraph) {
                var matches = assetGraph.findAssets({type: 'Html'})[0].text.match(/<link rel="apple-touch-startup-image" href="foo.png">/g);
                expect(matches, 'not to be null');
                expect(matches, 'to have length', 3);
            }
        }
    }
})['export'](module);
