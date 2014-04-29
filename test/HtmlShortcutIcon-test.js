var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('HtmlShortcutIcon').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlShortcutIcon/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 2);
        },
        'the graph should contain 7 HtmlShortcutIcon relation': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'HtmlShortcutIcon', 7);
        },
        'then attach two more HtmlShortcutIcon relation before and after the first one': {
            topic: function (assetGraph) {
                var htmlAsset = assetGraph.findAssets({type: 'Html'})[0],
                    pngAsset = assetGraph.findAssets({type: 'Png'})[0],
                    firstExistingHtmlShortcutIconRelation = assetGraph.findRelations({type: 'HtmlShortcutIcon'})[0];
                new AssetGraph.HtmlShortcutIcon({
                    from: htmlAsset,
                    to: pngAsset
                }).attach(htmlAsset, 'after', firstExistingHtmlShortcutIconRelation);
                new AssetGraph.HtmlShortcutIcon({
                    from: htmlAsset,
                    to: pngAsset
                }).attach(htmlAsset, 'before', firstExistingHtmlShortcutIconRelation);
                return assetGraph;
            },
            'the graph should contain 9 HtmlShortcutIcon relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlShortcutIcon', 9);
            },
            'the Html should contain three properly formatted <link> tags': function (assetGraph) {
                var matches = assetGraph.findAssets({type: 'Html'})[0].text.match(/<link rel="shortcut icon" href="foo.png">/g);
                expect(matches, 'not to be null');
                expect(matches, 'to have length', 3);
            }
        }
    }
})['export'](module);
