var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('<embed src="..."> test').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlEmbed/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain one HtmlEmbed relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlEmbed'}, true).length, 1);
        },
        'the graph should contain one Flash asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Flash'}, true).length, 1);
        },
        'the urls of the HtmlEmbed relation should be correct': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlEmbed'}, true)[0].href, 'foo.swf');
        },
        'then move the index.html asset one subdir down': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'foo/index.html');
                return assetGraph;
            },
            'the urls of the HtmlEmbed relation should have ../ prepended': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlEmbed'}, true)[0].href, '../foo.swf');
            }
        }
    }
})['export'](module);
