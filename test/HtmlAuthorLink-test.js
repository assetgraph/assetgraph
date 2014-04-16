var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('Html with <link rel="author">').addBatch({
    'After loading the test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlAuthorLink/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },

        'the graph should contain HtmlAuthorLink relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlAuthorLink'}).length, 2);
        },
        'the graph should contain two Text assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text'}).length, 2);
        }
    }
})['export'](module);
