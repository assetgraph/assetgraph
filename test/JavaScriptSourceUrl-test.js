var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

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
    },
    'After loading a test case with two JavaScript assets, then running the addJavaScriptSourceUrl transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptSourceUrl/bundleRelations/'})
                .loadAssets('index.html')
                .populate()
                .addJavaScriptSourceUrl()
                .run(this.callback);
        },
        'the graph should contain 2 JavaScriptSourceUrl relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptSourceUrl'}).length, 2);
        },
        'the serialized JavaScript assets should contain the @sourceURL directive': function (assetGraph) {
            assert.matches(assetGraph.findAssets({url: /\/foo\.js$/})[0].text, /@\s*sourceURL=\/foo\.js/);
            assert.matches(assetGraph.findAssets({url: /\/bar\.js$/})[0].text, /@\s*sourceURL=\/bar\.js/);
        },
        'then run the bundleRelations transform': {
            topic: function (assetGraph) {
                assetGraph
                    .bundleRelations({type: 'HtmlScript'})
                    .run(this.callback);
            },
            'the graph should contain 3 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
            },
            'the serialized bundle should contain both @sourceURL directives': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'JavaScript'}).pop().text,
                               /\/\/\s*@\ssourceURL=\/foo\.js[\s\S]*\/\/\s*@\s*sourceURL=\/bar\.js/);
            }
        }
    }
})['export'](module);
