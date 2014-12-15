/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/moveAssetsInOrder', function () {
    it('should throw if mandatory second argument is missing', function () {
        var tq = new AssetGraph({root: 'http://www.example.com/blah/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'http://www.example.com/blah/quux.html'});

        expect(tq.moveAssetsInOrder, 'to throw');
    });

    it('should visit assets in the correct order', function (done) {
        var order = ['first.css', 'second.css', 'third.css', 'main.css'];
        var idx = 0;

        new AssetGraph({root: 'testdata/transforms/moveAssetsInOrder/'})
            .loadAssets('index.html')
            .populate()
            .moveAssetsInOrder({ type: 'Css' }, function (asset, assetGraph) {
                expect(asset.fileName, 'to be', order[idx]);
                idx += 1;
            })
            .run(done);
    });

    it('should throw an error when encountering circular references', function (done) {
        new AssetGraph({root: 'testdata/transforms/moveAssetsInOrder/'})
            .loadAssets('circular.html')
            .populate()
            .run(function (error, assetGraph) {

                expect(assetGraph.moveAssetsInOrder({ type: 'Css' }, '/css/').run, 'to throw');

                done();
            });

    });
});
