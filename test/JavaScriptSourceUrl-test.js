var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
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
            expect(assetGraph, 'to contain assets', 4);
        },
        'the graph should contain 2 JavaScriptSourceUrl relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'JavaScriptSourceUrl', 2);
        },
        'then mark bundle.js dirty': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/bundle\.js$/})[0].markDirty();
                return assetGraph;
            },
            'the reserialized bundle.js should contain both @sourceUrl directives': function (assetGraph) {
                var javaScript = assetGraph.findAssets({url: /\/bundle\.js$/})[0];
                expect(javaScript.text, 'to match', /@\s*sourceURL=bar\.js/);
                expect(javaScript.text, 'to match', /@\s*sourceURL=foo\.js/);
            },
            'then change the url of the bundle': {
                topic: function (assetGraph) {
                    assetGraph.findAssets({url: /\/bundle\.js$/})[0].url = assetGraph.root + 'foo/bundle.js';
                    return assetGraph;
                },
                'the JavaScriptSourceUrl relations should be updated': function (assetGraph) {
                    var javaScript = assetGraph.findAssets({url: /\/bundle\.js$/})[0];
                    expect(javaScript.text, 'to match', /@\s*sourceURL=..\/bar\.js/);
                    expect(javaScript.text, 'to match', /@\s*sourceURL=..\/foo\.js/);
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
            expect(assetGraph, 'to contain relations', 'JavaScriptSourceUrl', 2);
        },
        'the serialized JavaScript assets should contain the @sourceURL directive': function (assetGraph) {
            expect(assetGraph.findAssets({url: /\/foo\.js$/})[0].text, 'to match', /@\s*sourceURL=\/foo\.js/);
            expect(assetGraph.findAssets({url: /\/bar\.js$/})[0].text, 'to match', /@\s*sourceURL=\/bar\.js/);
        },
        'then run the bundleRelations transform': {
            topic: function (assetGraph) {
                assetGraph
                    .bundleRelations({type: 'HtmlScript'})
                    .run(this.callback);
            },
            'the graph should contain 3 JavaScript assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            },
            'the serialized bundle should contain both @sourceURL directives': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'}).pop().text, 'to match',
                               /\/\/\s*@\ssourceURL=\/foo\.js[\s\S]*\/\/\s*@\s*sourceURL=\/bar\.js/);
            }
        }
    }
})['export'](module);
