var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('file: urls').addBatch({
    'After loading test case with non-ASCII file names': {
        topic: function () {
            new AssetGraph({root: __dirname + '/fileUrl/'})
                .loadAssets('spaces, unsafe chars & ñøń-ÃßÇ¡¡.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset');
        }
    }
})['export'](module);
