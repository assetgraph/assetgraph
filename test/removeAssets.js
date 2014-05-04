var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

describe('removeAssets', function () {
    it('should handle a test case with empty assets', function (done) {
        new AssetGraph({root: __dirname + '/removeAssets/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
            })
            .removeAssets({isEmpty: true, type: query.or('Css', 'JavaScript')})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset');
                expect(assetGraph, 'to contain no relations');
            })
            .run(done);
    });
});
