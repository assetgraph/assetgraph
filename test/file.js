var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

describe('file: resolver', function () {
    it('should handle a test case with non-ASCII file names', function (done) {
        new AssetGraph({root: __dirname + '/fileUrl/'})
            .loadAssets('spaces, unsafe chars & ñøń-ÃßÇ¡¡.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset');
            })
            .run(done);
    });
});
