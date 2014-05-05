var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/compressJavaScript', function () {
    [undefined, 'uglifyJs'/*, 'yuicompressor', 'closurecompiler'*/].forEach(function (compressorName) {
        it('with compressorName=' + compressorName + ' should yield a compressed JavaScript', function (done) {
            new AssetGraph()
                .loadAssets(new AssetGraph.JavaScript({text: "var foo = 123;"}))
                .compressJavaScript({type: 'JavaScript'}, compressorName)
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'JavaScript');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /^var foo=123;?\n?$/);
                })
                .run(done);
        });
    });
});
