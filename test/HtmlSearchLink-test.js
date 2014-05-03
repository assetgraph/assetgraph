var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('Html with <link rel="search">').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlSearchLink/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain an HtmlSearchLink relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlSearchLink');
        },
        'the graph should contain a single Xml asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Xml');
        }
    }
})['export'](module);
