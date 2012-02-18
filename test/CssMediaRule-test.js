var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('css @media rule').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssMediaRule/'})
                .loadAssets('relationInMediaRule.css')
                .populate()
                .run(this.callback)
        },
        'the graph should contain two CssImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 2);
        }
    }
})['export'](module);
