var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('HTML with <link rel="alternate">').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/htmlAlternateLink/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain two RSS assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'RSS'}).length, 2);
        },
        'the graph should contain a single Atom asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Atom'}).length, 1);
        },
        'the graph should contain a single XML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'XML'}).length, 1);
        }
    }
})['export'](module);
