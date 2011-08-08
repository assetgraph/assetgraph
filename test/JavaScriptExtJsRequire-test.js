var vows = require('vows'),
    assert = require('assert'),
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
                var htmlScriptUrls = assetGraph.findRelations({from: {isInitial: true}, type: 'HtmlScript'}).map(function (relation) {
                    return relation.url;
                });
                assert.deepEqual(htmlScriptUrls, [
                    '3rdparty/ext/src/core/src/lang/SomethingInCoreLang.js',
                    '3rdparty/ext/src/core/src/util/SomethingInCoreUtil.js',
                    'Foo/Bar.js',
                    'quuxroot/Base.js',
                    'quuxroot/Baz.js',
                    'quuxroot/SomeMixin.js',
                    'quuxroot/SomethingLazyLoaded.js',
                    'quuxroot/Bar.js',
                    undefined
                ]);
            }
        }
    }
})['export'](module);
