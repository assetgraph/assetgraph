var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
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
            expect(assetGraph, 'to contain relation', 'HtmlFluidIconLink');
        },
        'the graph should contain a single Png asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Png');
        }
    }
})['export'](module);
