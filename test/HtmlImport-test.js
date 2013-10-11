var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('Html with <link rel="import">').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlImport/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 HtmlImport relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlImport'}).length, 1);
        }
    }
})['export'](module);
