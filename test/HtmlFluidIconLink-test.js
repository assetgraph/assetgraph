var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('Html with <link rel="fluid-icon">').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlFluidIconLink/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain an HtmlFluidIconLink relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlFluidIconLink'}).length, 1);
        },
        'the graph should contain a single Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        }
    }
})['export'](module);
