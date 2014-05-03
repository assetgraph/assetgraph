var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('Html with <link rel="author">').addBatch({
    'After loading the test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlAuthorLink/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },

        'the graph should contain HtmlAuthorLink relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'HtmlAuthorLink', 2);
        },
        'the graph should contain two Text assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Text', 2);
        }
    }
})['export'](module);
