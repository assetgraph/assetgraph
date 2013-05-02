var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('JavaScriptRequireJsCommonJsCompatibilityRequire').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptRequireJsCommonJsCompatibilityRequire/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 7);
        },
        'the graph should contain one JavaScriptRequireJsCommonJsCompatibilityRequire relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptRequireJsCommonJsCompatibilityRequire'}).length, 1);
        },
        'the graph should contain 2 JavaScriptCommonJsRequire relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptCommonJsRequire'}).length, 2);
        },
        'the graph should contain over/the/rainbow/foo.js, and it should be loaded': function (assetGraph) {
            assert.equal(assetGraph.findAssets({url: /\/over\/the\/rainbow\/foo\.js$/, isLoaded: true}).length, 1);
        }
    }
})['export'](module);
