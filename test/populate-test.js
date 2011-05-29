var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('transforms.populate test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/populate/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate({to: {type: query.not('CSS')}})
            ).run(this.callback);
        },
        'the graph should contain no CSS assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 0);
        },
        'the graph should contain no resolved HTMLStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HTMLStyle'}).length, 0);
        },
        'the graph should contain an HTMLStyle relation with to:{isResolved:true} and an absolute url': function (assetGraph) {
            var htmlStyles = assetGraph.findRelations({type: 'HTMLStyle'}, true);
            assert.equal(htmlStyles.length, 1);
            assert.notEqual(htmlStyles[0].to.isAsset, true);
            assert.equal(htmlStyles[0].to.isResolved, true);
            assert.equal(htmlStyles[0].to.url, assetGraph.root + 'style.css');
        }
    }
})['export'](module);
