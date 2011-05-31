var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('<object><param name="src" value="..."></object> test').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/htmlObject/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate({
                    followRelations: function () {return false;}
                })
            ).run(this.callback);
        },
        'the graph should contain 3 HTMLObject relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HTMLObject'}, true).length, 3);
        },
        'the urls of the HTMLObject relations should be correct': function (assetGraph) {
            assert.deepEqual(assetGraph.findRelations({type: 'HTMLObject'}, true).map(function (relation) {return relation._getRawUrlString();}),
                            ['themovie.swf', 'theothermovie.swf', 'yetanothermovie.swf']);
        },
        'then move the index.html asset one subdir down': {
            topic: function (assetGraph) {
                assetGraph.setAssetUrl(assetGraph.findAssets({type: 'HTML'})[0], assetGraph.root + 'foo/index.html');
                return assetGraph;
            },
            'the urls of the HTMLObject relations should have ../ prepended': function (assetGraph) {
                assert.deepEqual(assetGraph.findRelations({type: 'HTMLObject'}, true).map(function (relation) {return relation._getRawUrlString();}),
                                 ['../themovie.swf', '../theothermovie.swf', '../yetanothermovie.swf']);
            }
        }
    }
})['export'](module);
