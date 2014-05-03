var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('Remove empty assets').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/removeEmptyAssets/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 3);
        },
        'then running the removeEmptyAssets transform on Css and JavaScript assets': {
            topic: function (assetGraph) {
                assetGraph.removeAssets({isEmpty: true, type: query.or('Css', 'JavaScript')}).run(done);
            },
            'the graph should contain 1 asset': function (assetGraph) {
                expect(assetGraph, 'to contain asset');
            },
            'the graph should contain no relations': function (assetGraph) {
                expect(assetGraph, 'to contain no relations');
            }
        }
    }
})['export'](module);
