/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/mergeIdenticalAssets', function () {
    it('should handle a combo test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/mergeIdenticalAssets/combo/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 4);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain assets', 'Png', 2);
                expect(assetGraph, 'to contain relations', 'HtmlImage', 2);
                expect(assetGraph, 'to contain relations', {from: {type: 'CacheManifest'}}, 2);
            })
            .mergeIdenticalAssets()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Png');
                expect(assetGraph, 'to contain relation', {from: {type: 'CacheManifest'}});

                var htmlImages = assetGraph.findRelations({type: 'HtmlImage'});
                expect(htmlImages, 'to have length', 2);
                expect(htmlImages[0].to, 'to equal', htmlImages[1].to);
            })
            .run(done);
    });

    it('should handle a test case with a JavaScript asset and a Css asset with identical contents', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/mergeIdenticalAssets/identicalAssetsOfDifferentTypes/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain assets', 'Css', 2);
            })
            .mergeIdenticalAssets()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .run(done);
    });
});
