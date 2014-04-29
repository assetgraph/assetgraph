var _ = require('underscore'),
    vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('<object><param name="src" value="..."></object> test').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlObject/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 HtmlObject relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations including unresolved', 'HtmlObject', 3);
        },
        'the graph should contain 3 Flash assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Flash', 3);
        },
        'the urls of the HtmlObject relations should be correct': function (assetGraph) {
            expect(_.pluck(assetGraph.findRelations({type: 'HtmlObject'}, true), 'href'), 'to equal',
                             ['themovie.swf', 'theothermovie.swf', 'yetanothermovie.swf']);
        },
        'then move the index.html asset one subdir down': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'foo/index.html');
                return assetGraph;
            },
            'the urls of the HtmlObject relations should have ../ prepended': function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({type: 'HtmlObject'}, true), 'href'), 'to equal',
                                 ['../themovie.swf', '../theothermovie.swf', '../yetanothermovie.swf']);
            }
        }
    }
})['export'](module);
