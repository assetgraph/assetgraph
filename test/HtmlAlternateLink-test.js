var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('Html with <link rel="alternate">').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlAlternateLink/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 HtmlAlternateLink relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'HtmlAlternateLink', 4);
        },
        'the graph should contain two Rss assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Rss', 2);
        },
        'the graph should contain a single Atom asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Atom');
        },
        'the graph should contain a single Xml asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Xml');
        }
    }
})['export'](module);
