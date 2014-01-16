var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('Css').addBatch({
    'After loading test case that has a parse error in an inline Css asset': {
        topic: function () {
            var err,
                callback = this.callback;
            new AssetGraph({root: __dirname + '/Css/'})
                .on('warn', function (_err) {
                    err = _err;
                })
                .loadAssets('parseErrorInInlineCss.html')
                .run(function () {
                    callback(err);
                });
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
            var err,
                callback = this.callback;
            new AssetGraph({root: __dirname + '/Css/'})
                .on('warn', function (_err) {
                    err = _err;
                })
                .loadAssets('parseErrorInExternalCss.html')
                .populate()
                .run(function () {
                    callback(err);
                });
        },
        'it should result in an Error object': function (err, assetGraph) {
            assert.instanceOf(err, Error);
        },
        'the error message should specify the url of the external Css asset': function (err, assetGraph) {
            assert.matches(err.message, /parseError\.css/);
        }
    }
})['export'](module);
