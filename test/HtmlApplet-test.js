var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('HtmlApplet').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlApplet/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 2);
        },
        'the graph should contain one Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain one HtmlApplet relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlApplet'}).length, 1);
        },
        'the graph should contain one Asset asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Asset'}).length, 1);
        }
    }
})['export'](module);
