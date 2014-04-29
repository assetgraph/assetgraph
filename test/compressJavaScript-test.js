var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('transforms.compressJavaScript').addBatch(function () {
    var test = {};
    // The YUICompressor and ClosureCompiler tests fail intermittently on Travis
    [undefined, 'uglifyJs'/*, 'yuicompressor', 'closurecompiler'*/].forEach(function (compressorName) {
        test[String(compressorName)] = {
            topic: function () {
                var assetGraph = new AssetGraph();
                assetGraph.addAsset(new AssetGraph.JavaScript({text: "var foo = 123;"}));
                assetGraph.compressJavaScript({type: 'JavaScript'}, compressorName).run(this.callback);
            },
            'should yield a compressed JavaScript': function (assetGraph) {
                var javaScripts = assetGraph.findAssets({type: 'JavaScript'});
                expect(javaScripts, 'to have length', 1);
                expect(javaScripts[0].text, 'to match', /^var foo=123;?\n?$/);
            }
        };
    });
    return test;
}())['export'](module);
