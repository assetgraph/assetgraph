var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
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
            expect(err, 'to be an', Error);
        },
        'the error message should specify the url of the Html asset': function (err, assetGraph) {
            expect(err.message, 'to match', /parseErrorInInlineCss\.html/);
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
            expect(err, 'to be an', Error);
        },
        'the error message should specify the url of the external Css asset': function (err, assetGraph) {
            expect(err.message, 'to match', /parseError\.css/);
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
            expect(assetGraph, 'to contain asset', 'Css');
        },
        'the text of the Css asset should contain three occurrences @font-face': function (assetGraph) {
            var matches = assetGraph.findAssets({type: 'Css'})[0].text.match(/@font-face/g);
            expect(matches, 'to have length', 3);
        },
        'then mark the Css asset dirty': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Css'})[0].markDirty();
                return assetGraph;
            },
            'the text of the Css asset should still contain 3 occurrences of @font-face': function (assetGraph) {
                var matches = assetGraph.findAssets({type: 'Css'})[0].text.match(/@font-face/g);
                expect(matches, 'to have length', 3);
            }
        }
    }
})['export'](module);
