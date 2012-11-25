var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('Html with <link rel="fluid-icon">').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlMsApplicationTileImageMeta/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain an HtmlMsApplicationTileImageMeta relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlMsApplicationTileImageMeta'}).length, 1);
        },
        'the graph should contain a single Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        }
    }
})['export'](module);
