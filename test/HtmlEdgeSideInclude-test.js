var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('Edge side include test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlEdgeSideInclude/'})
                .loadAssets('index.html')
                .populate({
                    followRelations: {to: {url: /\.html$/}}
                })
                .run(done);
        },
        'the graph should contain two Html assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Html', 2);
        },
        'the graph should contain one populated HtmlEdgeSideInclude relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlEdgeSideInclude');
        },
        'the graph should contain two HtmlEdgeSideInclude relations in total': function (assetGraph) {
            expect(assetGraph, 'to contain relations including unresolved', 'HtmlEdgeSideInclude', 2);
        },
        'then move the index.html one subdir down': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/index\.html/})[0].url = urlTools.resolveUrl(assetGraph.root, 'foo/index.html');
                return assetGraph;
            },
            'the url of the unpopulated HtmlEdgeSideInclude relation should be updated': function (assetGraph) {
                expect(assetGraph.findRelations({to: {url: /\.php$/}, type: 'HtmlEdgeSideInclude'}, true)[0].href, 'to equal',
                             '../dynamicStuff/getTitleForReferringPage.php');
            }
        }
    }
})['export'](module);
