var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('Html with <link rel="import">').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlImport/'})
            /*
                .on('addAsset', function (rel) {
                    console.log(rel.toString());
                })
                .on('warn', function (e) {
                    console.log(e);
                })
*/
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 HtmlImport relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlImport'}).length, 3);
        },
        'the graph should contain 4 populated Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({
                type: 'Html',
                isPopulated: true
            }).length, 4);
        },
        'the graph should contain 1 populated Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({
                type: 'Css',
                isPopulated: true
            }).length, 1);
        }
    }
})['export'](module);
