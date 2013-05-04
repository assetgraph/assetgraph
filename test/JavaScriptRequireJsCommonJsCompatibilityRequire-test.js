var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('JavaScriptRequireJsCommonJsCompatibilityRequire').addBatch({
    'After loading a test case that also has some common.js requires': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptRequireJsCommonJsCompatibilityRequire/withCommonJs/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 7);
        },
        'the graph should contain 0 JavaScriptAmdDefine relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdDefine'}).length, 0);
        },
        'the graph should contain one JavaScriptRequireJsCommonJsCompatibilityRequire relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptRequireJsCommonJsCompatibilityRequire'}).length, 1);
        },
        'the graph should contain 2 JavaScriptCommonJsRequire relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptCommonJsRequire'}).length, 2);
        },
        'the graph should contain over/the/rainbow/foo.js, and it should be loaded': function (assetGraph) {
            assert.equal(assetGraph.findAssets({url: /\/over\/the\/rainbow\/foo\.js$/, isLoaded: true}).length, 1);
        },
        'then run the convertJavaScriptRequireJsCommonJsCompatibilityRequireToJavaScriptAmdDefine transform': {
            topic: function (assetGraph) {
                assetGraph
                    .convertJavaScriptRequireJsCommonJsCompatibilityRequireToJavaScriptAmdDefine()
                    .run(this.callback);
            },
            'the graph should contain one JavaScriptAmdDefine relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdDefine'}).length, 1);
            },
            'commonJsIsh should have "somewhere/foo" in its dependency array': function (assetGraph) {
                assert.equal(assetGraph.findAssets({text: /\[\"somewhere\/foo\"\]/}).length, 1);
            },
            'then run flattenRequireJs': {
                topic: function (assetGraph) {
                    assetGraph
                        .flattenRequireJs({type: 'Html'})
                        .run(this.callback);
                },
                'the Html asset should have an HtmlScript relation to an asset with the contents of over/the/rainbow/foo.js': function (assetGraph) {
                    assert.equal(assetGraph.findRelations({type: 'HtmlScript', from: {type: 'Html'}, to: {text: /return 42/}}).length, 1);
                }
            }
        }
    }
})['export'](module);
