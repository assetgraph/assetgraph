var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('assets.JavaScript').addBatch({
    'After loading test case that has a parse error in an inline JavaScript asset': {
        topic: function () {
            var assetGraph = new AssetGraph({root: __dirname + '/JavaScript/'}).queue(
                transforms.loadAssets('parseErrorInInlineJavaScript.html')
            ).run(this.callback);
        },
        'it should result in an Error object': function (err, assetGraph) {
            assert.instanceOf(err, Error);
        },
        'the error message should specify the url of the Html asset and the line number of the error': function (err, assetGraph) {
            assert.matches(err.message, /parseErrorInInlineJavaScript\.html/);
            assert.matches(err.message, /line 2\b/);
            assert.matches(err.message, /column 8\b/);
        }
    },
    'After loading test case that has a parse error in an external JavaScript asset': {
        topic: function () {
            var assetGraph = new AssetGraph({root: __dirname + '/JavaScript/'}).queue(
                transforms.loadAssets('parseErrorInExternalJavaScript.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'it should result in an Error object': function (err, assetGraph) {
            assert.instanceOf(err, Error);
        },
        'the error message should specify the url of the external JavaScript asset and the line number of the error': function (err, assetGraph) {
            assert.matches(err.message, /parseError\.js/);
            assert.matches(err.message, /line 6\b/);
            assert.matches(err.message, /column 13\b/);
        }
    }
})['export'](module);
