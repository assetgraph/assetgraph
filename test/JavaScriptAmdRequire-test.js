var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('relations.JavaScriptCommonJsRequire').addBatch({
    'After loading test case with an Html asset that loads require.js and uses it in an inline script': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/simple/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 3 JavaScriptAmdRequire relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdRequire'}).length, 3);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        }
    },
    'After loading test case with an Html asset that loads require.js and includes a data-main attribute on the script tag': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/withDataMain/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain a HtmlRequireJsMain relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'}).length, 1);
        },
        'the graph should contain 4 JavaScriptAmdRequire relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdRequire'}).length, 4);
        },
        'the graph should contain 2 JavaScriptAmdDefine relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdDefine'}).length, 2);
        },
        'the graph should contain 4 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 4);
        },
        'the graph should contain a Text asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text'}).length, 1);
        },
        'then run the flattenStaticIncludes transform': {
            topic: function (assetGraph) {
                assetGraph.runTransform(transforms.flattenStaticIncludes(), this.callback);
            },
            'there should be no HtmlRequireJsMain relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'}).length, 0);
            },
            'there should be no JavaScriptAmdRequire relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdRequire'}).length, 0);
            },
            'there should be no JavaScriptAmdDefine relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdDefine'}).length, 0);
            },
            'the Html asset should have 4 outgoing HtmlScript relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlScript', from: {url: /\/index\.html$/}}).length, 4);
            },
            'the injected HtmlScript relations should come after the one pointing at require.js in the right order': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({type: 'HtmlScript', from: {url: /\/index\.html$/}}), 'href'),
                                 [
                                     'scripts/require.js',
                                     'scripts/helper/yet/another.js',
                                     'scripts/helper/util.js',
                                     'scripts/main.js'
                                 ]);
            }
        }
    }
})['export'](module);
