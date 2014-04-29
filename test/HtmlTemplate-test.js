var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
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
            expect(assetGraph, 'to contain relations', 'HtmlImage', 3);
        },
        'the graph should contain 1 HtmlTemplate relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlTemplate');
        },
        'the graph should contain 1 HtmlStyle relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlStyle');
        },
        'the Html parent asset should have 1 HtmlImage relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', {
                type: 'HtmlImage',
                from: {
                    type: 'Html',
                    isFragment: false
                }
            });
        },
        'the Html template asset should have 2 HtmlImage relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', {
                type: 'HtmlImage',
                from: {
                    type: 'Html',
                    isFragment: true
                }
            }, 2);
        }
    }
})['export'](module);
