var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('relations.CssImage').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssImage/'})
                .loadAssets('index.css')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 9 CssImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 9);
        }
    }
})['export'](module);
