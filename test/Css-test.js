var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('assets.Css').addBatch({
    'After loading test case that has a parse error in an inline Css asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/Css/'})
                .loadAssets('parseErrorInInlineCss.html')
                .run(this.callback);
        },
        'it should result in an Error object': function (err, assetGraph) {
            assert.instanceOf(err, Error);
        },
        'the error message should specify the url of the Html asset': function (err, assetGraph) {
            assert.matches(err.message, /parseErrorInInlineCss\.html/);
        }
    },
    'After loading test case that has a parse error in an external Css asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/Css/'})
                .loadAssets('parseErrorInExternalCss.html')
                .populate()
                .run(this.callback);
        },
        'it should result in an Error object': function (err, assetGraph) {
            assert.instanceOf(err, Error);
        },
        'the error message should specify the url of the external Css asset': function (err, assetGraph) {
            assert.matches(err.message, /parseError\.css/);
        }
    }
})['export'](module);
