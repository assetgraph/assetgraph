var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('Html with <link rel="import">').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlImport/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 HtmlImport relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'HtmlImport', 3);
        },
        'the graph should contain 4 populated Html assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', {
                type: 'Html',
                isPopulated: true
            }, 4);
        },
        'the graph should contain 1 populated Css asset': function (assetGraph) {
            expect(assetGraph, 'to contain assets', {
                type: 'Css',
                isPopulated: true
            }, 1);
        }
    }
})['export'](module);
