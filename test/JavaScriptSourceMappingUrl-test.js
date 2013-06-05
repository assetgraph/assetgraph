var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('JavaScriptSourceUrl').addBatch({
    'After loading a test case with a JavaScript asset that has @sourceMappingURL directive': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptSourceMappingUrl/existingSourceMap/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 3);
        },
        'the graph should contain 1 JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 1);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain 1 SourceMap asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'SourceMap'}).length, 1);
        },
        'the graph should contain 1 JavaScriptSourceMappingUrl relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptSourceMappingUrl'}).length, 1);
        },
        'then change the url of the JavaScript asset': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'})[0].url = assetGraph.root + 'foo/jquery.js';
                return assetGraph;
            },
            'the JavaScriptSourceMappingUrl relations should be updated': function (assetGraph) {
                var javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
                assert.matches(javaScript.text, /@\s*sourceMappingURL=..\/jquery-1.10.1.min.map/);
            }
        }
    }
})['export'](module);
