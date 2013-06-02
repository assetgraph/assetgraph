var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('JavaScriptSourceUrl').addBatch({
    'After loading a test case with an existing bundle that has @sourceURL directives': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptSourceUrl/existingBundle/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 4);
        },
        'the graph should contain 2 JavaScriptSourceUrl relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptSourceUrl'}).length, 2);
        },
        'then mark bundle.js dirty': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/bundle\.js$/})[0].markDirty();
                return assetGraph;
            },
            'the reserialized bundle.js should contain both @sourceUrl directives': function (assetGraph) {
                var javaScript = assetGraph.findAssets({url: /\/bundle\.js$/})[0];
                assert.matches(javaScript.text, /@\s*sourceURL=bar\.js/);
                assert.matches(javaScript.text, /@\s*sourceURL=foo\.js/);
            },
            'then change the url of the bundle': {
                topic: function (assetGraph) {
                    assetGraph.findAssets({url: /\/bundle\.js$/})[0].url = assetGraph.root + 'foo/bundle.js';
                    return assetGraph;
                },
                'the JavaScriptSourceUrl relations should be updated': function (assetGraph) {
                    var javaScript = assetGraph.findAssets({url: /\/bundle\.js$/})[0];
                    assert.matches(javaScript.text, /@\s*sourceURL=..\/bar\.js/);
                    assert.matches(javaScript.text, /@\s*sourceURL=..\/foo\.js/);
                }
            }
        }
    }
})['export'](module);
