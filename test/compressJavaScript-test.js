var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('transforms.compressJavaScript').addBatch(function () {
    var test = {};
    [undefined, 'uglifyJs', 'yuicompressor', 'closurecompiler'].forEach(function (compressorName) {
        test[String(compressorName)] = {
            topic: function () {
                var assetGraph = new AssetGraph();
                assetGraph.addAsset(new AssetGraph.JavaScript({text: "var foo = 123;"}));
                assetGraph.compressJavaScript({type: 'JavaScript'}, compressorName).run(this.callback);
            },
            'should yield a compressed JavaScript': function (assetGraph) {
                var javaScripts = assetGraph.findAssets({type: 'JavaScript'});
                assert.equal(javaScripts.length, 1);
                assert.matches(javaScripts[0].text, /^var foo=123;?\n?$/);
            }
        };
    });
    return test;
}())['export'](module);
