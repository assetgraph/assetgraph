var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('relations.JavaScriptAmdRequire').addBatch({
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
        },
        'then detach the JavaScriptAmdRequire relation pointing at a.js': {
            topic: function (assetGraph) {
                assetGraph.findRelations({to: {url: /\/a\.js$/}})[0].detach();
                return assetGraph;
            },
            'the graph should contain 2 JavaScriptAmdRequire relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdRequire'}).length, 2);
            },
            'a.js and the corresponding function parameter should be removed from the including asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript', isInline: true})[0].text,
                             'require(["some/module","b.js"],function(someModule,b){})');
            }
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
        }
    }
})['export'](module);
