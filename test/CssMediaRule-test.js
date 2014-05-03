var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('css @media rule').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssMediaRule/'})
                .loadAssets('relationInMediaRule.css')
                .populate()
                .run(done);
        },
        'the graph should contain two CssImage relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'CssImage', 2);
        }
    }
})['export'](module);
