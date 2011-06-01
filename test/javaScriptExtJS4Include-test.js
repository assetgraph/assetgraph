var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('Ext.Loader, Ext.require and Ext.define (ExtJS 4)').addBatch({
    'After loading a test case with three assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/javaScriptExtJS4Include/'}).queue(
                transforms.registerLabelsAsCustomProtocols([
                    {name: 'Quux', url: __dirname + '/javaScriptExtJS4Include/quuxroot'},
                    {name: 'Ext', type: 'extJS4Dir', url: __dirname + '/javaScriptExtJS4Include/3rdparty/ext/src'}
                ]),
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 9 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 9);
        },
        'the graph should contain 7 JavaScriptExtJS4Include relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptExtJS4Include'}).length, 7);
        },
        'then run the flattenStaticIncludes transform': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.flattenStaticIncludes({isInitial: true})).run(this.callback);
            },
            'the graph should contain two HTMLScript relations pointing at /Foo/Bar.js and the inline script, respectively': function (assetGraph) {
                var htmlScriptUrls = assetGraph.findRelations({from: {isInitial: true}, type: 'HTMLScript'}).map(function (relation) {
                    return relation._getRawUrlString();
                });
                assert.deepEqual(htmlScriptUrls, [
                    '3rdparty/ext/src/core/src/lang/SomethingInCoreLang.js',
                    '3rdparty/ext/src/core/src/util/SomethingInCoreUtil.js',
                    'Foo/Bar.js',
                    'quuxroot/Base.js',
                    'quuxroot/Baz.js',
                    'quuxroot/SomeMixin.js',
                    'quuxroot/Bar.js',
                    undefined
                ]);
            }
        }
    }
})['export'](module);
