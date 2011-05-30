var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('Edge side include test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/htmlEdgeSideInclude/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate({
                    followRelations: {to: {url: /\.html$/}}
                })
            ).run(this.callback);
        },
        'the graph should contain two HTML assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 2);
        },
        'the graph should contain one populated HTMLEdgeSideInclude relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HTMLEdgeSideInclude'}).length, 1);
        },
        'the graph should contain two HTMLEdgeSideInclude relations in total': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HTMLEdgeSideInclude'}, true).length, 2);
        },
        'then move the index.html one subdir down': {
            topic: function (assetGraph) {
                assetGraph.setAssetUrl(assetGraph.findAssets({url: /\/index\.html/})[0], assetGraph.root + 'foo/index.html');
                return assetGraph;
            },
            'the url of the unpopulated HTMLEdgeSideInclude relation should be updated': function (assetGraph) {
                assert.equal(assetGraph.findRelations({to: {url: /\.php$/}, type: 'HTMLEdgeSideInclude'}, true)[0]._getRawUrlString(),
                             '../dynamicStuff/getTitleForReferringPage.php');
            }
        }
    }
})['export'](module);
