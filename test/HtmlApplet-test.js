var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('HtmlApplet').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlApplet/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 2 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 2);
        },
        'the graph should contain one Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain one HtmlApplet relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlApplet');
        },
        'the graph should contain one Asset asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Asset');
        }
    }
})['export'](module);
