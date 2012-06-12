var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

// Asserts that protocol-relative urls are ignored when encountered in assets on file: urls
vows.describe('file: urls').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/fileUrl/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 1);
        }
    }
})['export'](module);
