var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('<embed src="..."> test').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/htmlEmbed/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate({
                    followRelations: function () {return false;}
                })
            ).run(this.callback);
        },
        'the graph should contain one HtmlEmbed relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlEmbed'}, true).length, 1);
        },
        'the urls of the HtmlEmbed relation should be correct': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlEmbed'}, true)[0]._getRawUrlString(), 'foo.swf');
        },
        'then move the index.html asset one subdir down': {
            topic: function (assetGraph) {
                assetGraph.setAssetUrl(assetGraph.findAssets({type: 'Html'})[0], assetGraph.root + 'foo/index.html');
                return assetGraph;
            },
            'the urls of the HtmlEmbed relation should have ../ prepended': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlEmbed'}, true)[0]._getRawUrlString(), '../foo.swf');
            }
        }
    }
})['export'](module);
