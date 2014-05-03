var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('JavaScriptSourceUrl').addBatch({
    'After loading a test case with a JavaScript asset that has @sourceMappingURL directive': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptSourceMappingUrl/existingSourceMap/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 4);
        },
        'the graph should contain 2 JavaScript asset': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 2);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain 1 SourceMap asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'SourceMap');
        },
        'the graph should contain 1 JavaScriptSourceMappingUrl relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'JavaScriptSourceMappingUrl');
        },
        'the graph should contain 1 SourceMapFile relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'SourceMapFile');
        },
        'the graph should contain 1 SourceMapSource relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'SourceMapSource');
        },
        'then change the url of the JavaScript asset': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'})[0].url = assetGraph.root + 'foo/jquery.js';
                return assetGraph;
            },
            'the JavaScriptSourceMappingUrl relations should be updated': function (assetGraph) {
                var javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
                expect(javaScript.text, 'to match', /@\s*sourceMappingURL=..\/jquery-1.10.1.min.map/);
            }
        }
    }
})['export'](module);
