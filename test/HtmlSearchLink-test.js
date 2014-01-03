var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('Html with <link rel="search">').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlSearchLink/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain an HtmlSearchLink relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlSearchLink'}).length, 1);
        },
        'the graph should contain a single Xml asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Xml'}).length, 1);
        }
    }
})['export'](module);
