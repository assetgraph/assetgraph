var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
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
            expect(assetGraph, 'to contain relation', 'HtmlEmbed');
        },
        'the graph should contain one Flash asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Flash');
        },
        'the urls of the HtmlEmbed relation should be correct': function (assetGraph) {
            expect(assetGraph, 'to contain relation including unresolved', {type: 'HtmlEmbed', href: 'foo.swf'});
        },
        'then move the index.html asset one subdir down': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'foo/index.html');
                return assetGraph;
            },
            'the urls of the HtmlEmbed relation should have ../ prepended': function (assetGraph) {
                expect(assetGraph, 'to contain relation including unresolved', {type: 'HtmlEmbed', href: '../foo.swf'});
            }
        }
    }
})['export'](module);
