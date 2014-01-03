var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('Html with <template>').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlTemplate/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 HtmlImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlImage'}).length, 3);
        },
        'the graph should contain 1 HtmlTemplate relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlTemplate'}).length, 1);
        },
        'the graph should contain 1 HtmlStyle relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 1);
        },
        'the Html parent asset should have 1 HtmlImage relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: 'HtmlImage',
                from: {
                    type: 'Html',
                    isFragment: false
                }
            }).length, 1);
        },
        'the Html template asset should have 2 HtmlImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: 'HtmlImage',
                from: {
                    type: 'Html',
                    isFragment: true
                }
            }).length, 2);
        }
    }
})['export'](module);
