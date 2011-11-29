var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('Html with <link rel="alternate">').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlAlternateLink/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 4 HtmlAlternateLink relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlAlternateLink'}).length, 4);
        },
        'the graph should contain two Rss assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Rss'}).length, 2);
        },
        'the graph should contain a single Atom asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Atom'}).length, 1);
        },
        'the graph should contain a single Xml asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Xml'}).length, 1);
        }
    }
})['export'](module);
