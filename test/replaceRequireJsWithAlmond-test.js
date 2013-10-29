var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    fs = require('fs'),
    requirejs = fs.readFileSync(__dirname + '/replaceRequireJsWithAlmond/require.js', 'utf8'),
    almond = fs.readFileSync(__dirname + '/replaceRequireJsWithAlmond/almond.js', 'utf8');

vows.describe('transforms.replaceRequireJsWithAlmond').addBatch({
    'After loading a non-almond test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/replaceRequireJsWithAlmond/'})
                .loadAssets('require-pure.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 1);
        },
        'the JavaScript asset text should be equal to require.js': function (assetGraph) {
            var asset = assetGraph.findAssets({type: 'JavaScript'}).pop(),
                text = asset && asset.text;

            assert.equal(text, requirejs);
        },
        'then running the replaceRequireJsWithAlmond transform': {
            topic: function (assetGraph) {
                assetGraph
                    .replaceRequireJsWithAlmond()
                    .run(this.callback);
            },
            'the graph should contain 1 JavaScript asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 1);
            },
            'the JavaScript asset text should be equal to require.js': function (assetGraph) {
                var asset = assetGraph.findAssets({type: 'JavaScript'}).pop(),
                    text = asset && asset.text;

                assert.equal(text, requirejs);
            }
        }
    },
    'After loading an almond test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/replaceRequireJsWithAlmond/'})
                /*
                // Debugging
                .on('addAsset', function (asset) {
                    console.warn('add', asset.url);
                })
                .on('removeAsset', function (asset) {
                    console.warn('remove', asset.url);
                })
                */
                .loadAssets('require-almond.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
        },
        'the graph should contain 1 HtmlScript relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlScript'}).length, 1);
        },
        'the graph should contain 1 HtmlRequireJsAlmondReplacement relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsAlmondReplacement'}).length, 1);
        },
        'the JavaScript asset text should be equal to require.js': function (assetGraph) {
            var relation = assetGraph.findRelations({type: 'HtmlScript'}).pop(),
                text = relation && relation.to.text;

            assert.equal(text, requirejs);
        },
        'then running the replaceRequireJsWithAlmond transform': {
            topic: function (assetGraph) {
                assetGraph
                    .replaceRequireJsWithAlmond()
                    .run(this.callback);
            },
            'the graph should contain 1 JavaScript asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 1);
            },
            'the graph should contain 1 HtmlScript relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlScript'}).length, 1);
            },
            'the graph should contain 0 HtmlRequireJsAlmondReplacement relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsAlmondReplacement'}).length, 0);
            },
            'the JavaScript asset text should be equal to almond.js': function (assetGraph) {
                var relation = assetGraph.findRelations({type: 'HtmlScript'}).pop(),
                    text = relation && relation.to.text;

                assert.equal(text, almond);
            }
        }
    }
})['export'](module);
