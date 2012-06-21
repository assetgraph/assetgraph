var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('file: urls').addBatch({
    'After loading test case with a protocol relative url in an asset loaded from a file:// url': {
        topic: function () {
            new AssetGraph({root: __dirname + '/fileUrl/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 asset': function (assetGraph) {
            // Asserts that protocol-relative urls are ignored when encountered in assets on file: urls
            assert.equal(assetGraph.findAssets().length, 1);
        }
    },
    'After loading test case with non-ASCII file names': {
        topic: function () {
            new AssetGraph({root: __dirname + '/fileUrl/'})
                .loadAssets('spaces, unsafe chars & ñøń-ÃßÇ¡¡.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 1);
        }
    }
})['export'](module);
