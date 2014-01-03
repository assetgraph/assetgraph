var _ = require('underscore'),
    vows = require('vows'),
    assert = require('assert'),
    urlTools = require('url-tools'),
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
            assert.equal(assetGraph.findRelations({type: 'HtmlObject'}, true).length, 3);
        },
        'the graph should contain 3 Flash assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Flash'}).length, 3);
        },
        'the urls of the HtmlObject relations should be correct': function (assetGraph) {
            assert.deepEqual(_.pluck(assetGraph.findRelations({type: 'HtmlObject'}, true), 'href'),
                             ['themovie.swf', 'theothermovie.swf', 'yetanothermovie.swf']);
        },
        'then move the index.html asset one subdir down': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'foo/index.html');
                return assetGraph;
            },
            'the urls of the HtmlObject relations should have ../ prepended': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({type: 'HtmlObject'}, true), 'href'),
                                 ['../themovie.swf', '../theothermovie.swf', '../yetanothermovie.swf']);
            }
        }
    }
})['export'](module);
