var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('Css').addBatch({
    'After loading test case that has a parse error in an inline Css asset': {
        topic: function () {
            var err,
                callback = this.callback;
            new AssetGraph({root: __dirname + '/Css/parseErrors/'})
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
            new AssetGraph({root: __dirname + '/Css/parseErrors/'})
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
    },
    'After loading a test that has multiple neighbour @font-face rules': {
        topic: function () {
            new AssetGraph({root: __dirname + '/Css/multipleFontFaceRules/'})
                .loadAssets('index.css')
                .populate()
                .run(this.callback);
        },
        'the graph should contain one Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the text of the Css asset should contain three occurrences @font-face': function (assetGraph) {
            var matches = assetGraph.findAssets({type: 'Css'})[0].text.match(/@font-face/g);
            assert.equal(matches.length, 3);
        },
        'then mark the Css asset dirty': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Css'})[0].markDirty();
                return assetGraph;
            },
            'the text of the Css asset should still contain 3 occurrences of @font-face': function (assetGraph) {
                var matches = assetGraph.findAssets({type: 'Css'})[0].text.match(/@font-face/g);
                assert.equal(matches.length, 3);
            }
        }
    }
})['export'](module);
