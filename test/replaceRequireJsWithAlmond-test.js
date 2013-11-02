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
                //.drawGraph('1-before.svg')
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
                    //.drawGraph('1-after.svg')
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
                //.drawGraph('2-before.svg')
                .run(this.callback);
        },
        'the graph should contain 3 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
        },
        'the graph should contain 3 HtmlScript relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlScript'}).length, 3);
        },
        'the graph should contain 2 HtmlRequireJsAlmondReplacement relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsAlmondReplacement'}).length, 2);
        },
        'the JavaScript asset text should be equal to require.js': function (assetGraph) {
            var relation = assetGraph.findRelations({type: 'HtmlScript'})[0],
                text = relation && relation.to.text;

            assert.equal(text, requirejs);
        },
        'then running the replaceRequireJsWithAlmond transform': {
            topic: function (assetGraph) {
                assetGraph
                    .replaceRequireJsWithAlmond()
                    //.drawGraph('2-after.svg')
                    .run(this.callback);
            },

            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'the graph should contain 3 HtmlScript relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlScript'}).length, 3);
            },
            'the graph should contain 0 HtmlRequireJsAlmondReplacement relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsAlmondReplacement'}).length, 0);
            },
            'the first JavaScript assets text should be equal to almond.js': function (assetGraph) {
                var relation = assetGraph.findRelations({type: 'HtmlScript'})[0],
                    text = relation && relation.to.text;

                assert.equal(text, almond);
            },
            'the second JavaScripts asset text should not have been replaced with almond': function (assetGraph) {
                var relation = assetGraph.findRelations({type: 'HtmlScript'})[2],
                    text = relation && relation.to.text;

                assert.equal(text, 'alert(\'APP\');\n');
            }
        }
    }
})['export'](module);
