var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    resolvers = require('../lib/resolvers'),
    urlTools = require('../lib/util/urlTools'),
    query = AssetGraph.query;

vows.describe('Ext.Loader, Ext.require and Ext.define (ExtJs 4)').addBatch({
    'After loading a test case with three assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptExtJsRequire/'}).queue(
                function (assetGraph) {
                    assetGraph.resolverByProtocol.Foo = resolvers.fixedDirectory(urlTools.fsFilePathToFileUrl(__dirname + '/JavaScriptExtJsRequire/Foo'));
                    assetGraph.resolverByProtocol.Quux = resolvers.fixedDirectory(urlTools.fsFilePathToFileUrl(__dirname + '/JavaScriptExtJsRequire/quuxroot'));
                    assetGraph.resolverByProtocol.Ext = resolvers.extJs4Dir(urlTools.fsFilePathToFileUrl(__dirname + '/JavaScriptExtJsRequire/3rdparty/ext/src'));
                },
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 10 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 10);
        },
        'the graph should contain 8 JavaScriptExtJsRequire relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptExtJsRequire'}).length, 8);
        },
        'then run the flattenStaticIncludes transform': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.flattenStaticIncludes({isInitial: true})).run(this.callback);
            },
            'the graph should contain two HtmlScript relations pointing at /Foo/Bar.js and the inline script, respectively': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({from: {isInitial: true}, type: 'HtmlScript'}), 'href'), [
                    '3rdparty/ext/src/core/src/lang/SomethingInCoreLang.js',
                    '3rdparty/ext/src/core/src/util/SomethingInCoreUtil.js',
                    'Foo/Bar.js',
                    'quuxroot/Base.js',
                    'quuxroot/Baz.js',
                    'quuxroot/SomethingElse.js',
                    'quuxroot/SomeMixin.js',
                    'quuxroot/Bar.js',
                    undefined
                ]);
            }
        }
    },
    'After loading the same test case again': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptExtJsRequire/'}).queue(
                function (assetGraph) {
                    assetGraph.resolverByProtocol.Foo = resolvers.fixedDirectory(urlTools.fsFilePathToFileUrl(__dirname + '/JavaScriptExtJsRequire/Foo'));
                    assetGraph.resolverByProtocol.Quux = resolvers.fixedDirectory(urlTools.fsFilePathToFileUrl(__dirname + '/JavaScriptExtJsRequire/quuxroot'));
                    assetGraph.resolverByProtocol.Ext = resolvers.extJs4Dir(urlTools.fsFilePathToFileUrl(__dirname + '/JavaScriptExtJsRequire/3rdparty/ext/src'));
                },
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        // Need a vow here due to https://github.com/cloudhead/vows/issues/53
        'the graph should contain 10 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 10);
        },
        'then detach the first Ext.require relation from the inline script': {
            topic: function (assetGraph) {
                assetGraph.findRelations({from: assetGraph.findAssets({isInline: true, type: 'JavaScript'})[0]})[0].detach();
                return assetGraph;
            },
            'the Ext.require(\'Ext.SomethingInCoreUtil\'); statement should be gone': function (assetGraph) {
                assert.equal(assetGraph.findAssets({isInline: true, type: 'JavaScript'})[0].text.indexOf("Ext.SomethingInCoreUtil"), -1);
            },
            'then detach the next Ext.require relation from the inline script': {
                topic: function (assetGraph) {
                    assetGraph.findRelations({from: assetGraph.findAssets({isInline: true, type: 'JavaScript'})[0]})[0].detach();
                    return assetGraph;
                },
                'the Ext.require(\'Foo.Bar\', function () {...}); statement should have turned into Ext.require([], function () {...}': function (assetGraph) {
                    assert.notEqual(assetGraph.findAssets({isInline: true, type: 'JavaScript'})[0].text.indexOf("Ext.require([]"), -1);
                },
                'then detach the next Ext.require relation from the inline script': {
                    topic: function (assetGraph) {
                        assetGraph.findRelations({from: assetGraph.findAssets({isInline: true, type: 'JavaScript'})[0]})[0].detach();
                        return assetGraph;
                    },
                    'the Ext.require([\'Quux.Bar\'], function () {...}); statement should have turned into Ext.require([], function () {...}': function (assetGraph) {
                        assert.equal(assetGraph.findAssets({isInline: true, type: 'JavaScript'})[0].text.match(/Ext\.require\(\[\]/g).length, 2);
                    }
                }
            }
        }
    }
})['export'](module);
